from collections import Counter


def fit_bigram(texts):
    return Counter(pair for text in texts for pair in zip_tokens(text.casefold().split()))


def zip_tokens(tokens):
    return list(zip(tokens, tokens[1:]))
