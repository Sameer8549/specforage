"""Build the deployable float16 BGE-small UNSPSC matrix in streaming batches."""

import argparse
from pathlib import Path

import numpy as np
from numpy.lib.format import open_memmap

from specforge.unspsc import FastEmbedBackend, group_unspsc, iter_unspsc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--taxonomy", type=Path, default=Path("data/unspsc_codes.csv"))
    parser.add_argument("--output", type=Path, default=Path("data/unspsc_bge_small.float16.npy"))
    parser.add_argument("--model", default="BAAI/bge-small-en-v1.5")
    parser.add_argument("--batch-size", type=int, default=256)
    args = parser.parse_args()

    records = tuple(iter_unspsc(args.taxonomy))
    groups = group_unspsc(records)
    embedder = FastEmbedBackend(args.model)
    first = embedder.embed([groups[0].embedding_text])
    output = open_memmap(
        args.output, mode="w+", dtype=np.float16, shape=(len(groups), first.shape[1])
    )
    for start in range(0, len(groups), args.batch_size):
        batch = groups[start : start + args.batch_size]
        output[start : start + len(batch)] = embedder.embed(
            [record.embedding_text for record in batch]
        ).astype(np.float16)
        print(f"Embedded {start + len(batch):,}/{len(groups):,}", flush=True)
    output.flush()


if __name__ == "__main__":
    main()
