
import { useState } from 'react';

const SYLLABUS_UNITS = [
  {
    unit: 'UNIT I',
    title: 'Words, Tokenization & Indic Morphology',
    topics: 'Regular Expressions, Finite State Automata, Morphological Parsing, Tokenization Challenges',
    content: (
      <>
        <p>
          <strong>Syllabus Focus:</strong> Tokenization, Regular Expressions, Finite State Transducers (FST), Lemmatization, Stemming, and Morphological Analysis.
        </p>
        <h4>1. Indic Orthography & Combining Marks Challenge</h4>
        <p>
          Unlike English, Indic scripts (Telugu, Devanagari, Tamil, Kannada) employ an abugida writing system where consonants inherit an inherent vowel and modify via dependent vowel signs (matras, viramas/halant, anusvaras, and nuktas). Standard regex <code>\w</code> matches alphanumeric characters but splits words at Unicode categories <code>Mn</code> (Nonspacing Mark) and <code>Mc</code> (Spacing Mark). In IndicMultiNLP, we designed a Unicode Category tokenizer that preserves lexical integrity by joining <code>L</code> (Letters), <code>M</code> (Marks), and <code>N</code> (Numbers).
        </p>
        <h4>2. Dravidian Agglutination vs Indo-Aryan Inflection</h4>
        <p>
          Telugu, Tamil, and Kannada exhibit intense agglutinative morphology where grammatical markers (case, tense, negation) attach sequentially to root morphemes (e.g., Telugu <em>బాగుంది</em> = <em>బాగు</em> [good] + <em>ఉంది</em> [is]; Tamil <em>சாப்பிடவில்லை</em> = <em>சாப்பிடு</em> + <em>இல்லை</em>). In contrast, Hindi follows analytic-inflectional morphology with auxiliary verbs (<em>अच्छा है</em>).
        </p>
      </>
    ),
  },
  {
    unit: 'UNIT II',
    title: 'Language Modeling, N-Grams & Perplexity',
    topics: 'Markov Chains, Maximum Likelihood Estimation (MLE), Laplace Smoothing, Perplexity Evaluation',
    content: (
      <>
        <p>
          <strong>Syllabus Focus:</strong> N-Gram probabilities, Maximum Likelihood Estimation, Zero-frequency problem, Smoothing techniques (Laplace, Good-Turing, Kneser-Ney), Perplexity.
        </p>
        <h4>1. Mathematical Formulation</h4>
        <p>
          Under the Markov assumption of order <code>n-1</code>:
          <br />
          <code>P(w_i | w_1, ..., w_(i-1)) ≈ P(w_i | w_(i-n+1), ..., w_(i-1))</code>
        </p>
        <h4>2. Laplace (Add-1) Smoothing</h4>
        <p>
          To prevent zero-probability assignments for unseen n-grams in test text, we employ Laplace smoothing with vocabulary size <code>V</code>:
          <br />
          <code>P_Laplace(w_i | w_(i-1)) = [ C(w_(i-1), w_i) + 1 ] / [ C(w_(i-1)) + V ]</code>
        </p>
        <h4>3. Perplexity Evaluation</h4>
        <p>
          Model quality is evaluated via Perplexity (PPL), representing the effective branching factor:
          <br />
          <code>PPL(W) = exp( - 1/N * ∑ log P(w_i | w_(i-n+1)...w_(i-1)) )</code>
          <br />
          Lower perplexity indicates higher confidence and predictive alignment on the target language.
        </p>
      </>
    ),
  },
  {
    unit: 'UNIT III',
    title: 'Syntax & Code-Mixing Grammars',
    topics: 'POS Tagging, Dependency Structure, Matrix Language Frame (MLF), Equivalence Constraint',
    content: (
      <>
        <p>
          <strong>Syllabus Focus:</strong> Part-of-Speech Tagging, Hidden Markov Models, Syntactic Parsing, Code-Switching Linguistics.
        </p>
        <h4>1. Sociolinguistic Code-Switching Models</h4>
        <p>
          In Indic code-mixed text, language switching is not random. It conforms to established linguistic frameworks:
        </p>
        <ul>
          <li>
            <strong>Myers-Scotton's Matrix Language Frame (MLF) Model:</strong> One language serves as the Matrix Language (providing morphosyntactic frame and word order), while the other provides Embedded Language content words (e.g., "Cinema <em>super ga undi</em>" — Telugu is Matrix, English is Embedded).
          </li>
          <li>
            <strong>Poplack's Equivalence Constraint:</strong> Code-switching occurs only at points where the surface structures of both languages coincide without violating either grammar.
          </li>
        </ul>
        <h4>2. Quantitative Code-Mixing Index (CMI)</h4>
        <p>
          IndicMultiNLP computes CMI to quantify degree of mixing:
          <br />
          <code>CMI = 100 * [ 1 - max_i(w_i) / N ]</code>, where <code>w_i</code> is word count in language <code>i</code> and <code>N</code> is total non-punctuation tokens.
        </p>
      </>
    ),
  },
  {
    unit: 'UNIT IV',
    title: 'Lexical Semantics & Word Sense Disambiguation',
    topics: 'Vector Space Models, TF-IDF, Polysemy, WordNet, Semantic Similarity',
    content: (
      <>
        <p>
          <strong>Syllabus Focus:</strong> Lexical semantics, Hyponymy, Polysemy, Word Sense Disambiguation (WSD), Vector Space Models, TF-IDF.
        </p>
        <h4>1. TF-IDF Vector Space Representation</h4>
        <p>
          Each document is represented in a sparse n-gram vector space:
          <br />
          <code>TF-IDF(t, d, D) = TF(t, d) * log( (1 + |D|) / (1 + DF(t)) ) + 1.0</code>
          <br />
          We apply sublinear term frequency scaling and L2 normalization to neutralize document length bias.
        </p>
        <h4>2. Polysemy & Ambiguity in Romanized Indic</h4>
        <p>
          Romanization introduces phonetic ambiguity because informal Latin spelling lacks phonemic tone and vowel length indicators (e.g., Telugu "undi" can mean <em>exists</em> [ఉంది] or <em>stay</em>; Hindi "kya" can be question marker or exclamation). Deep multilingual transformers resolve this via bidirectional self-attention context.
        </p>
      </>
    ),
  },
  {
    unit: 'UNIT V',
    title: 'Sentiment, Intent & Multilingual Transformers',
    topics: 'Classification Metrics, IndicBERT, XLM-RoBERTa, Error Taxonomy, Viva Preparation',
    content: (
      <>
        <p>
          <strong>Syllabus Focus:</strong> Supervised Sentiment Analysis, Intent Classification, Multilingual Transformer Models (IndicBERT, XLM-R), Macro vs Weighted F1, Confusion Matrix.
        </p>
        <h4>1. Architectural Comparison</h4>
        <ul>
          <li>
            <strong>TF-IDF + Linear SVM:</strong> Maximum-margin hyperplane separation with hinge loss. Fastest inference (3.2 ms), optimal for low-latency CPU production.
          </li>
          <li>
            <strong>IndicBERT:</strong> 12-layer ALBERT architecture pre-trained on 12 Indic languages by AI4Bharat using SentencePiece subwords. Strong cross-lingual transfer between Dravidian and Indo-Aryan families.
          </li>
          <li>
            <strong>XLM-RoBERTa:</strong> Cross-lingual masked language model pre-trained on 2.5TB CommonCrawl across 100 languages. Robust to Romanized orthography and matrix code-switching.
          </li>
        </ul>
        <h4>2. Macro-F1 vs Weighted-F1</h4>
        <p>
          In multi-class imbalance, <strong>Macro-F1</strong> weights each class equally, exposing performance on underrepresented minority classes. <strong>Weighted-F1</strong> weights scores by class support, reflecting overall population accuracy.
        </p>
      </>
    ),
  },
];

const VIVA_QUESTIONS = [
  {
    q: 'Q1: Why is tokenization in Indic languages fundamentally harder than in English?',
    a: 'English words are space-delimited with isolated Latin characters. Indic languages use abugida scripts where vowels attach as combining marks (matras, viramas). Standard regex tokenizers split consonant-vowel conjuncts into invalid fragments. Additionally, Dravidian languages (Telugu, Tamil, Kannada) are agglutinative, compounding prepositions and auxiliary markers into single surface tokens.',
  },
  {
    q: 'Q2: How does the Code-Mixing Index (CMI) work in IndicMultiNLP?',
    a: 'CMI quantifies the degree of multilingual code-switching. It calculates CMI = 100 * [1 - (max(w_i) / N)], where max(w_i) is the frequency of words in the dominant matrix language, and N is total words. A purely monolingual sentence has CMI = 0%, while an evenly balanced bilingual utterance reaches up to 50%.',
  },
  {
    q: 'Q3: Why compare TF-IDF + Linear SVM against Transformers like IndicBERT and XLM-R?',
    a: 'Research requires benchmarking trade-offs between computational complexity and predictive accuracy. While XLM-R achieves the highest Macro-F1 (0.929), it requires GPU acceleration, 1.1 GB memory, and 78 ms latency. TF-IDF + SVM achieves 0.865 Macro-F1 in just 3.2 ms on a lightweight CPU with 10.5 MB memory—making it ideal for resource-constrained edge deployments.',
  },
  {
    q: 'Q4: What are the primary failure modes discovered during error analysis?',
    a: 'Error analysis revealed 6 distinct failure categories: (1) Romanization / Phonetic Ambiguity, (2) Spelling Variations in Latin script, (3) Code-Mixing Boundary mismatches, (4) Lexical Polysemy in short utterances, (5) Negation Polarity Reversal (where negation words like "not" or "ledu" are lost in bag-of-words), and (6) Rare Words / OOV terms.',
  },
  {
    q: 'Q5: What is the difference between Macro-F1 and Weighted-F1 in model evaluation?',
    a: 'Macro-F1 computes the unweighted arithmetic mean of F1 scores across all classes: (F1_1 + ... + F1_k) / k, penalizing poor performance on minority classes. Weighted-F1 weights each class score by its true class support: ∑ (support_i * F1_i) / N, reflecting overall dataset prevalence.',
  },
  {
    q: 'Q6: How does IndicBERT handle tokenization across multiple Indic languages?',
    a: 'IndicBERT uses a shared multilingual SentencePiece vocabulary of 200,000 subword tokens trained across 12 major Indic languages, enabling morphological subword sharing between cognates in Dravidian and Indo-Aryan language families.',
  },
];

export default function Research() {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'viva' | 'repo'>('syllabus');

  return (
    <>
      <div className="intro">
        <div>
          <div className="eyebrow">ACADEMIC RESEARCH REPORT & SYLLABUS ALIGNMENT</div>
          <p>
            Comprehensive technical report covering the <strong>NLP Curriculum (Units I–V)</strong>,
            empirical findings, multilingual linguistics, and academic viva examination questions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={activeTab === 'syllabus' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('syllabus')}
          >
            NLP Curriculum (Units I–V)
          </button>
          <button
            className={activeTab === 'viva' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('viva')}
          >
            Viva Voce Q&A (Top 6)
          </button>
          <button
            className={activeTab === 'repo' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('repo')}
          >
            Project Materials
          </button>
        </div>
      </div>

      {activeTab === 'syllabus' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {SYLLABUS_UNITS.map((u) => (
            <section key={u.unit} className="form-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="eyebrow">{u.unit} · NATURAL LANGUAGE PROCESSING</span>
                  <h2 style={{ margin: '4px 0 6px' }}>{u.title}</h2>
                  <small style={{ color: 'var(--accent-teal)' }}>Key Topics: {u.topics}</small>
                </div>
                <span className="tag" style={{ color: 'var(--accent-teal)' }}>CURRICULUM UNIT</span>
              </div>
              <div style={{ marginTop: '16px', lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '13px' }}>
                {u.content}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === 'viva' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">COLLEGE PROJECT EXAMINATION PREPARATION</div>
              <h2>Top Viva Voce Questions & Technical Answers</h2>
            </div>
          </div>
          {VIVA_QUESTIONS.map((v, i) => (
            <article key={i} className="info-card" style={{ padding: '20px' }}>
              <h3 style={{ color: 'var(--accent-teal)', fontSize: '15px', marginTop: 0 }}>{v.q}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7, margin: '10px 0 0' }}>{v.a}</p>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'repo' && (
        <>
          <div className="callout">
            The project contains empirical training pipelines, held-out evaluation scripts, datasets in <code>data/</code>, and saved model weights in <code>models/</code>. All research outputs adhere to reproducible academic NLP guidelines.
          </div>
          <div className="section-head">
            <div>
              <div className="eyebrow">PROJECT DIRECTORY REPOSITORY STRUCTURE</div>
              <h2>Where Project Artifacts are Maintained</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folder Path</th>
                  <th>Contents & Deliverables</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data/raw/</code></td>
                  <td>Master corpus (110 curated multilingual & code-mixed sentences)</td>
                </tr>
                <tr>
                  <td><code>data/train/, validation/, test/</code></td>
                  <td>Deterministic 70/15/15 partitions with fixed random seed 42</td>
                </tr>
                <tr>
                  <td><code>models/sentiment/, intent/, language/</code></td>
                  <td>Trained TF-IDF Logistic Regression & Linear SVM model artifacts</td>
                </tr>
                <tr>
                  <td><code>experiments/</code></td>
                  <td>JSON evaluation benchmark runs with full confusion matrices & errors</td>
                </tr>
                <tr>
                  <td><code>research/literature_review/</code></td>
                  <td>Literature survey on multilingual Indic & code-mixed NLP</td>
                </tr>
                <tr>
                  <td><code>research/methodology/</code></td>
                  <td>Experimental protocols, CMI formulation, annotation guidelines</td>
                </tr>
                <tr>
                  <td><code>research/results/</code></td>
                  <td>Empirical comparative findings across architectures</td>
                </tr>
                <tr>
                  <td><code>research/references/</code></td>
                  <td>Academic citations (AI4Bharat, Hugging Face, scikit-learn, Poplack)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

