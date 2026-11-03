from collections import Counter


def fit_trigram(texts):
    return Counter(tuple(tokens[i:i + 3]) for text in texts for tokens in [text.casefold().split()] for i in range(max(0, len(tokens) - 2)))
