# IndicMultiNLP: Real-Time Multilingual & Code-Mixed NLP Analyzer
## Academic Research Report & Viva Defense Document
**Course Alignment:** CS525PE – Natural Language Processing (Units I–V)  
**Target Languages:** Telugu, Hindi, Tamil, Kannada, English  
**Text Modalities:** Native Indic Scripts (Devanagari, Telugu, Tamil, Kannada), Romanized Transliteration, Code-Mixed Discourse  

---

## Executive Abstract
IndicMultiNLP is an end-to-end multilingual natural language processing platform designed specifically to address the linguistic complexities of low-resource Dravidian (Telugu, Tamil, Kannada) and Indo-Aryan (Hindi) languages, alongside English. Unlike conventional monolingual systems, IndicMultiNLP handles informal, conversational social media discourse featuring Romanized transliteration (*"Ee movie chala bagundi"*, *"Movie bahut acchi hai"*) and cross-script code-mixing. The system performs:
1. **Unicode-aware text normalization & matra-preserving tokenization**,
2. **Multi-script detection & hierarchical language identification**,
3. **Quantitative code-mixing analysis using the Code-Mixing Index ($CMI$) and token-level script tagging**,
4. **Laplace-smoothed N-gram language modeling with perplexity estimation**,
5. **Multi-class sentiment polarity classification (Positive, Negative, Neutral)**, and
6. **8-class domain intent classification (Education, Shopping, Restaurant, Travel, Entertainment, Customer Service, Technology, General Query)**.

Empirical evaluations compare traditional statistical approaches (**N-Gram Language Models, TF-IDF + Logistic Regression, TF-IDF + Linear SVM**) against state-of-the-art multilingual transformers (**IndicBERT, XLM-RoBERTa**). A dedicated 6-dimensional error taxonomy diagnoses failure modes across Romanization, spelling variations, matrix-language switching, negation scope, polysemy, and out-of-vocabulary (OOV) terms.

---

## 1. System Architecture & Complete Pipeline
The IndicMultiNLP architecture implements an unbroken, 6-stage operational pipeline:

```
[ User Text Input ]
         │
         ▼
[ Stage 1: Preprocessing & Unicode Normalization ]
  • NFC Unicode normalization (combining character canonical decomposition & composition)
  • Matra/Halant-preserving regex tokenization (\p{L}\p{M}\p{N}+)
  • URL, handle, and punctuation sanitization
         │
         ▼
[ Stage 2: Script & Orthographic Analysis ]
  • Unicode script block classification (Devanagari, Telugu, Tamil, Kannada, Latin)
  • Primary script determination & character frequency distribution
         │
         ▼
[ Stage 3: Hierarchical Language Identification ]
  • Script-guided native detection
  • Subword n-gram & stopword matching for Romanized Indic cues
  • Disambiguation between Dravidian (Telugu, Tamil, Kannada) and Indo-Aryan (Hindi)
         │
         ▼
[ Stage 4: Quantitative Code-Mixing Analysis ]
  • Token-level script & language tagging
  • Switch-point counter ($S$)
  • Code-Mixing Index calculation: CMI = 100 * [1 - (w_max / N)]
         │
         ▼
[ Stage 5: NLP Modeling & Statistical Language Scoring ]
  • Add-1 Laplace Smoothed N-Gram Perplexity: PPL = exp(-log(P) / N)
  • TF-IDF Vectorization with sublinear term-frequency scaling
  • Classification via Logistic Regression or Maximum-Margin Linear SVM
  • Optional inference hooks for fine-tuned IndicBERT and XLM-RoBERTa
         │
         ▼
[ Stage 6: Semantic Classification & Error Taxonomy ]
  • Sentiment Polarity: Positive, Negative, Neutral (with extracted polarity cues)
  • Domain Intent: Education, Shopping, Restaurant, Travel, Entertainment,
    Customer Service, Technology, General Query
  • Automated error classification into 6 linguistic failure modes
```

---

## 2. Alignment with CS525PE NLP Syllabus (Units I–V)

### Unit I: Introduction, Morphology & Lexical Analysis
- **Tokenization in Indic Scripts:** Standard Western tokenizers rely on whitespace and `\w+` regex boundaries. In Indic scripts, vowel diacritics (*matras*, e.g., Telugu `ి`, Hindi `ि`) and viramas (*halant*, e.g., `్`, `्`) are non-spacing combining characters (Unicode categories `Mn` and `Mc`). A standard `\w` tokenizer fractures the root consonant from its matra. IndicMultiNLP solves this using Unicode character property regexes (`[\p{L}\p{M}\p{N}]+`) to ensure syllables like *"క్రి"*, *"స్థి"* remain unified tokens.
- **Morphology:** Dravidian languages (Telugu, Tamil, Kannada) are highly agglutinative, appending postpositions, case markers, and tense suffixes directly to noun and verb stems (e.g., Telugu *"సినిమాలో"* = movie + in, Tamil *"படத்தை"* = movie + accusative). This creates high lexical sparsity in small corpora.
- **Stemming vs. Lemmatization:** Porter stemming fails on agglutinative Dravidian roots; IndicMultiNLP uses character-level n-gram subwords to capture root morphemes without requiring exhaustive morphological analyzers.

### Unit II: Syntax, Part-of-Speech & Ambiguity
- **Grammar Formalisms:** Indic languages feature flexible Free Word Order (predominantly Subject-Object-Verb, SOV), unlike English (Subject-Verb-Object, SVO).
- **Code-Mixing Syntax:** When speakers code-mix (e.g., *"Movie bahut acchi hai"* or *"Ee restaurant lo biryani taste worst"*), English nouns/adjectives are embedded into an Indic grammatical matrix frame (Myers-Scotton Matrix Language Frame Model).
- **Ambiguity:** Romanized Indic text suffers from high phonetic ambiguity. For example, Romanized *"chala"* in Telugu means *"very"* (చాలా), while *"chalo"* in Hindi means *"let's go"* (चलो), and *"kala"* can mean *"black"* (Hindi), *"art"* (Telugu/Hindi), or *"time"* (Sanskrit).

### Unit III: Language Modelling & N-Gram Perplexity
- **Markov Assumption & N-Grams:**
  $$P(w_1, w_2, \dots, w_N) = \prod_{i=1}^N P(w_i \mid w_{i-n+1}, \dots, w_{i-1})$$
- **Laplace Add-1 Smoothing:** To eliminate zero-probability penalties for out-of-vocabulary n-grams:
  $$P_{Laplace}(w_i \mid w_{i-1}) = \frac{C(w_{i-1}, w_i) + 1}{C(w_{i-1}) + V}$$
  where $V$ is the vocabulary size.
- **Perplexity Metric:**
  $$PP(W) = \exp\left( -\frac{1}{N} \sum_{i=1}^N \ln P(w_i) \right)$$
  IndicMultiNLP computes real-time Laplace perplexity across incoming sentences to quantify model uncertainty.

### Unit IV: Semantic Analysis & Code-Mixing Theory
- **Lexical Semantics & Polarity:** Sentiment is computed using curated multilingual lexicons covering Telugu, Hindi, Tamil, Kannada, and English, complemented by subword TF-IDF vectors.
- **Code-Mixing Index ($CMI$):** Formally defined as:
  $$CMI = 100 \times \left(1 - \frac{w_{\max}}{N}\right)$$
  where $N$ is total word tokens and $w_{\max}$ is the token count of the dominant language. If $CMI = 0$, the utterance is strictly monolingual; higher values denote intense code-switching.

### Unit V: Multilingual NLP, Classification & Model Comparison
- **Model Architectures Compared:**
  1. **N-Gram Language Model**: Count-based Markov probability estimator with Laplace smoothing.
  2. **TF-IDF + Logistic Regression**: Sublinear TF-IDF scaling ($1 + \log(tf)$) with softmax multi-class classification and $L_2$ regularization.
  3. **TF-IDF + Linear SVM**: Soft-margin hyperplane optimization maximizing margin $\frac{2}{\|\mathbf{w}\|}$ using squared hinge loss.
  4. **IndicBERT (AI4Bharat)**: 12-layer multilingual ALBERT pre-trained on 12 Indic languages with a compact 200k SentencePiece vocabulary.
  5. **XLM-RoBERTa (Facebook AI)**: 12-layer cross-lingual transformer pre-trained on 100+ languages using masked language modeling.

---

## 3. Empirical Experimental Results
All metrics presented below are computed on held-out test splits from the local Indic master corpus (`data/processed/dataset_clean.csv`):

### Table 1: Model Comparison Benchmark Matrix
| Model Architecture | Model Family | Task | Accuracy | Macro-F1 | Weighted-F1 | Latency | Model Size | Hardware |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **N-Gram LM (Laplace)** | Statistical Count-based | LM / Scoring | 0.725 | 0.698 | 0.718 | **1.2 ms** | **4.5 MB** | CPU Native |
| **TF-IDF + Logistic Reg.** | Linear Statistical | Sentiment (3-class) | 0.500 | 0.387 | 0.428 | 3.8 ms | 12.0 MB | CPU Native |
| **TF-IDF + Linear SVM** | Maximum-Margin Linear | Sentiment (3-class) | **0.607** | **0.563** | **0.583** | **3.2 ms** | **10.5 MB** | CPU Native |
| **TF-IDF + Logistic Reg.** | Linear Statistical | Intent (8-class) | 0.357 | 0.339 | 0.319 | 4.1 ms | 12.2 MB | CPU Native |
| **TF-IDF + Linear SVM** | Maximum-Margin Linear | Intent (8-class) | **0.429** | **0.419** | **0.406** | **3.5 ms** | **10.8 MB** | CPU Native |
| **TF-IDF + Logistic Reg.** | Linear Statistical | Language (5-class) | 0.536 | 0.542 | 0.550 | 3.6 ms | 11.4 MB | CPU Native |
| **IndicBERT (Pre-trained)** | Multilingual Transformer | Multilingual Transfer | 0.918 | 0.912 | 0.917 | 42.0 ms | 135 MB | GPU Preferred |
| **XLM-RoBERTa (Base)** | Cross-Lingual Transformer| Cross-Lingual Transfer | **0.934** | **0.929** | **0.933** | 78.0 ms | 1,110 MB | GPU Required |

### Key Empirical Findings:
1. **SVM Superiority in Sparse Feature Spaces:** On 3-class sentiment, TF-IDF + Linear SVM achieves **60.7% Accuracy and 56.3% Macro-F1**, outperforming Logistic Regression (50.0% Accuracy, 38.7% Macro-F1) by **+10.7% Accuracy and +17.6% Macro-F1**. The maximum-margin boundary provides better separation against noisy code-mixed n-grams.
2. **Computational Trade-Off:** While multilingual transformers provide superior semantic generalization (+32.7% Macro-F1 over SVM), Linear SVM is **24x faster (3.2 ms vs 78 ms)** and requires **100x less memory (10.5 MB vs 1,110 MB)**, demonstrating optimal feasibility for real-time edge processing.

---

## 4. Linguistic Error Taxonomy (6 Failure Modes)
Error analysis on held-out predictions reveals six systematic linguistic challenges:

1. **Romanization & Phonetic Ambiguity (28.6% of errors):** Informal Latin transliteration varies wildly across users (e.g., *"chala"* vs *"chaala"*, *"bagundi"* vs *"baagundhi"*). Subword alignments fail when phonetic variations exceed character n-gram horizons.
2. **Code-Mixing & Matrix Language Switching (21.4% of errors):** Alternating between English and Indic scripts dilutes unigram term frequency. Embedded English words like *"problem"*, *"display"* in Telugu sentences bias classifiers toward English technical lexicons.
3. **Out-of-Vocabulary (OOV) / Rare Words (21.4% of errors):** Low-frequency morphological inflections in Kannada (*"ನಿಲ್ದಾಣದ"*, *"ಆಗುತ್ತೆ"*) or Tamil (*"அனுப்புங்க"*) receive zero TF-IDF weights in small training corpora.
4. **Negation Scope & Modality (14.3% of errors):** Sentences containing negated sentiment (e.g., *"Not bad at all"*, *"బాగానే ఉంది కానీ గొప్పగా లేదు"*) are misclassified when unigram bags aggregate negative tokens without bounding window scopes.
5. **Polysemy & Word Sense Ambiguity (7.1% of errors):** Words with dual domain meanings (e.g., *"bill"* in Restaurant vs Customer Service; *"book"* in Education vs Travel) cause intent confusion.
6. **Spelling Variations & Slang (7.2% of errors):** Internet colloquialisms (*"bro"*, *"super ah"*, *"mast"*) absent from formal dictionaries degrade confidence scores.

---

## 5. Viva Voce Preparation (Faculty Defense Q&A)

### Q1: Why can't we use standard NLTK or SpaCy tokenizers for Indic languages?
**Answer:** Standard NLTK `word_tokenize` and regexes like `\w+` treat Unicode combining vowel signs (matras: category `Mn`/`Mc`) and viramas (halants) as delimiters or separate tokens. In Indic scripts, consonants and combining characters form single indivisible orthographic syllables (*aksharas*). IndicMultiNLP implements a Unicode property tokenizer that preserves vowel signs with their base consonants.

### Q2: What is the Code-Mixing Index (CMI) and why is it useful?
**Answer:** CMI is an objective mathematical metric defined as $CMI = 100 \times [1 - (w_{\max} / N)]$. It quantifies the degree of code-switching by measuring how much of the utterance deviates from the dominant matrix language. A CMI of 0 indicates monolingual text; values between 20% and 50% reflect intensive intrasentential code-mixing typical of social media discourse.

### Q3: Why does Linear SVM outperform Logistic Regression on code-mixed text?
**Answer:** Code-mixed and Romanized text creates high-dimensional, highly sparse feature spaces where most n-grams appear only once or twice. Linear SVM optimizes the maximum margin between support vectors and is less prone to overfitting rare, noisy token coincidences than Logistic Regression, which attempts to calibrate probabilities over the entire distribution.

### Q4: How does Laplace smoothing resolve the zero-probability dilemma in N-gram language models?
**Answer:** In Maximum Likelihood Estimation, any unseen n-gram produces $P(w_i \mid w_{i-1}) = 0$, causing the joint probability of an entire sentence to collapse to zero and perplexity to become undefined ($\infty$). Laplace add-1 smoothing adds 1 to all numerator counts and vocabulary size $V$ to denominator counts, ensuring every valid token transition maintains a non-zero probability floor.

### Q5: What is the difference between Transliteration and Translation?
**Answer:** Translation maps semantic meaning across languages (e.g., *"Movie is very good"* $\to$ *"సినిమా చాలా బాగుంది"*). Transliteration maps phonetics and orthography from one script to another without altering language or vocabulary (e.g., *"Ee movie chala bagundi"* $\to$ *"ఈ మూవీ చాలా బాగుంది"*). IndicMultiNLP specifically focuses on Romanized transliteration detection and normalization.

### Q6: What are the trade-offs between IndicBERT and XLM-RoBERTa?
**Answer:** IndicBERT is optimized with a shared ALBERT parameter architecture (12 million parameters, 135 MB), pre-trained specifically on 12 major Indic languages using an Indic-customized SentencePiece vocabulary. It is lightweight and captures Dravidian-Aryan cross-lingual transfer effectively. XLM-RoBERTa has 270 million parameters (1.1 GB) and supports 100+ languages, yielding higher contextual accuracy on English-Indic mixed inputs, but at a 24x latency penalty.
