from functools import lru_cache

from app.ingest.loaders import dataset_samples, load_dataset
from app.models.dataset import DatasetSamples, DatasetSnapshot


@lru_cache
def get_dataset_snapshot() -> DatasetSnapshot:
    return load_dataset()


def get_dataset_samples() -> DatasetSamples:
    return dataset_samples(get_dataset_snapshot())
