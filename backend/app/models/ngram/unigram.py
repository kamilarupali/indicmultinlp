from collections import Counter


def fit_unigram(texts):
    return Counter(token for text in texts for token in text.casefold().split())
