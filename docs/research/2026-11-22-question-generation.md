# Question generator: research note

Research note, 2026-11-22, from the overnight build (Generator stream). No code changed.

**The goal.** Endless, skill sets and Daily 10 never run dry, on the way to 200,000 questions. Free methods only, never the paid API. Generated questions are for practice, never for full-length exams. An admin can tell original from generated; students cannot.

## What we built tonight, in one paragraph

**Math:** we wrote item models (templates) by hand for each of the 38 Math skills, after reading real questions in our bank for style, length and difficulty. A template draws its numbers from a seeded random generator, so the same template and seed always rebuild the same question. Answers are computed exactly: fractions, square roots and pi are never rounded. Each wrong choice comes from a named slip, such as "you added 7 to both sides instead of subtracting it." A second, separate calculation then confirms that the key is right and every wrong choice is wrong. The builder also refuses any question that does not render or draw cleanly, or whose difficulty falls outside the template's range. **Reading and Writing:** Claude helpers write original passages and questions modeled on real items. A second helper, who never sees the writer's answer, answers each question blind and audits it. Disagreement goes to a third judge or to the bin, and near-duplicates are removed. **Both:** every generated question is stored as "generated", with its template, seed, batch and checks ([migration](../../supabase/migrations/20261122020000_question_origin.sql)). A database rule keeps it out of every pool but practice, and only an admin sees the mark.

## Is this a "machine learning algorithm"?

Not in the usual sense. We trained no model tonight. There are four parts, and only the last one learns from data.

1. **Item models, learned from our own bank.** People and helpers read real questions and wrote down each pattern: what stays fixed, what can change, and which changes make it harder. _Can:_ make endless correct Math questions in shapes we know. _Cannot:_ invent a new kind of question, or know its true difficulty.
2. **Helper writing.** The helpers are Claude, a large language model that Anthropic trained; we use it as it is. _Can:_ write fresh passages and questions fast. _Cannot:_ be trusted alone. It can be confidently wrong: a bad key, two good answers, a false fact.
3. **Independent checks.** Code re-checks every Math answer; a second helper answers each Reading and Writing question blind. _Can:_ catch most errors. _Cannot:_ catch all of them; a checker from the same model family can share the writer's blind spots.
4. **Calibration from student answers.** A simple rating method (Elo, later item response theory) measures how hard each question really is. _Can:_ correct our difficulty guesses and flag broken questions. _Cannot:_ work before about 100 answers per family, or fix what it flags.

In short: hand-built item models and helper writers, checked twice, then tuned by real students' answers.

## What the research says

### 1. Item models (automatic item generation)

**What the field knows.** Automatic item generation (see Gierl and Haladyna's 2013 book) has a computer fill a template, called an item model. Gierl and Lai describe three steps: map the knowledge a problem needs (a cognitive model), turn it into a template with slots, then generate; one medical item model produced 1,248 questions. Gierl, Zhou and Alves (2008) name two kinds of slot. **Incidentals** are surface details (names, settings, harmless numbers); changing only these makes isomorphs, twins of equal difficulty. **Radicals** are deep features (an extra step, a negative number); changing one makes a variant with a new difficulty. Building items from a theory of how people solve them (Embretson, 1998) is called "strong theory"; varying a parent item's surface is "weak theory", which needs data to confirm it (Fu and colleagues, 2022; Circi and colleagues, 2023). When an adaptive test made twins on the fly that were not truly equal, scores got a little less precise but not skewed (Bejar and colleagues, 2003).

College Board builds the digital SAT this way. A "parent model" yields "child items" that differ only in incidentals. A sample of children is tried on real students (at least 1,000 each, 5,000 per parent); if their success rates stray more than 0.05 from the children's average, the parent is pulled. Children per parent are kept few on purpose, so the pool does not become "overly homogenized and predictable." Generative AI helps College Board's writers (topic ideas, research, style reviews) but does not replace them.

**What it means for us.** Our template is a parent model; each seed is a child. Each template should name its radicals, and each change of radical is a separate variant with its own difficulty label. Cap the children per variant, and check that siblings play alike once data arrives.

### 2. Helper-written questions and how to check them

**What the field knows.** Language models write usable questions, but not reliably: a systematic review of model-written medical exam questions found faulty ones in every study it covered (Artsi and colleagues, 2024). At best they match textbook items in difficulty and discrimination (Bhandari and colleagues, 2024). Duolingo's English test team had a separate model confirm each generated question could be answered, then gave each item at least three content and two fairness reviews; 454 of 789 passages (58%) survived (Attali and colleagues, 2022).

The best checks are independent and blind. A "round-trip" check keeps a question only if a separate model, answering fresh, reaches the same answer (Alberti and colleagues, 2019). MathCAMPS computed answers with a solver, had a model write each word problem and translate it back, and kept it only if the answers matched; in a hand check of 245 problems, it caught 25 of the 30 unfaithful ones, and 97.7% of what passed was faithful. Model judges favor certain positions, longer answers and their own writing (Zheng and colleagues, 2023; Panickssery and colleagues, 2024). A majority vote over several solutions beats one solution (Wang and colleagues, 2023), and plain rule checks found more item-writing flaws than GPT-4 did (91% against 79%; Moore and colleagues, 2023). A good reading item is answerable with the passage and not without it (Säuberli and Clematide, 2024). Models also repeat memorized text, more so when it was common in training (Carlini and colleagues, 2023).

**What it means for us.** Keep the checker blind to the writer's key and reasoning. Have it answer twice with the choices reordered, and once with the passage hidden, which should fail. Make the auditor say why each wrong choice is wrong, and audit against a fixed rubric such as Haladyna, Downing and Rodriguez's 31 item-writing guidelines (2002). Run plain code rules first (length, four distinct choices). Send disagreement to a judge or the bin. Code, not a helper, computes every Math key, as program-aided methods do (Gao and colleagues, 2023).

### 3. Wrong choices from real errors

**What the field knows.** Brown and Burton's BUGGY (1978) showed that many student mistakes are systematic "bugs" in a procedure, which can be written as programs. Sadler (1998) built tests whose wrong choices are known misconceptions, so each wrong answer tells you something. College Board wants each wrong choice to be a common error, plausible but never competing with the key (for a full review, see Gierl and colleagues, 2017). Language models write valid wrong answers but are weaker at predicting real students' errors (Feng and colleagues, 2024); in a 2026 preprint, models fell from 66% accuracy solving problems to 40% when predicting, from one worked mistake, what that student would answer next (Chen and colleagues). A wrong choice picked by under 5% of students, or favored by stronger students, is "not working"; in one exam study only 52.2% worked (Tarrant and colleagues, 2009). College Board flags any wrong choice that stronger students favor, often a sign of a second right answer.

**What it means for us.** Our named slips are the BUGGY idea in code, and better than a helper's guesses. After launch, count how often each slip is chosen: swap in a spare for one nobody picks, and flag one that strong students pick.

### 4. Difficulty: measure it, predict it, correct it

**What the field knows.** Item response theory gives each student an ability number and each question a difficulty number on one scale; the chance of a right answer depends on the gap. The Rasch model uses only difficulty. The two- and three-parameter models add how sharply a question separates weaker from stronger students, then a guessing floor; College Board uses the three-parameter model. For templates, each family has a typical difficulty and its members scatter around it, so a new member borrows its family's number until it has data (Glas and van der Linden, 2003; Sinharay, Johnson and Williamson, 2003; Geerlings, Glas and van der Linden, 2011).

Elo, the chess rating, updates after every answer. Pelánek (2016) finds it nearly as accurate as a full fit, with about 100 students per question, and unlike plain percent correct it still works when an adaptive mode picks questions near each student's level. Math Garden uses it (Klinkenberg and colleagues, 2011).

Predicting difficulty from text alone is hard: in the 2024 BEA shared task, the best of 17 teams barely beat always guessing the average (error 0.299 against 0.311; for reviews, see AlKhuzaey and colleagues, 2023, and Benedetto and colleagues, 2023). For template-made probability problems, a model built on the templates' design features explained item difficulty (Holling and colleagues, 2009). Language models posing as students can approximate item statistics, but no single model matched real students (Liu, Bhandari and Pardos, 2024).

**What it means for us.** We do not claim to predict difficulty. We start from our labels and let student answers correct them, family by family.

### 5. Near-duplicates

**What the field knows.** Cut each text into overlapping runs of words ("shingles"); the share of runs two texts have in common is their Jaccard similarity (Broder, 1997). MinHash shrinks each text to a short signature that estimates this quickly, and locality-sensitive hashing finds likely pairs without comparing every pair (both are taught in Stanford's Mining of Massive Datasets course). SimHash gives each text a 64-bit fingerprint (Charikar, 2002); Google found that treating fingerprints within 3 bits of each other as near-duplicates worked across 8 billion web pages (Manku and colleagues, 2007). Removing near-duplicates from training data made models repeat memorized text about ten times less often (Lee and colleagues, 2022), and the GPT-3 team treated any shared 13-word run as possible copying. Sentence embeddings also catch paraphrases (Reimers and Gurevych, 2019).

**What it means for us.** Check every Reading and Writing passage and question against the whole bank, originals and generated, and flag any shared 13-word run. Reuse the character 5-gram Jaccard score our [import plan](../ingestion/released-exam-import-optimized-workflow.md) already describes. For Math, compare each question's skeleton (numbers blanked) and its numbers, and reject any seed that recreates a real question. Embeddings can come later.

### 6. The SAT's public specifications (background only)

College Board's technical manual describes the test's shape. Reading and Writing: four choices, one best answer; one passage per question, 25 to 150 words (a "word" counted as six characters); literature, history and social studies, humanities and science; no outside knowledge of the topic needed. Math: about 75% multiple choice and 25% typed answers; about 30% in a real-world context, most of those 50 words or fewer. Items get fairness reviews by outside experts using a checklist, and the ETS fairness guidelines (2022) list topics to avoid. We use these facts only for shape, length and topics. We never copy real SAT questions and never call ours official.

## How difficulty works for us

**Start from an editorial rating.** Each template and variant carries a 1 to 7 rating, set by reading similar real questions: a first guess. Our [October note](2026-10-bluebook-difficulty-and-adaptivity.md) found the bank's ratings lean easy, so hard families matter most.

**Then: Elo with a family head start.** A family is one template at one level and one format (four choices or typed); for Reading and Writing, one skill at one level.

1. Each student gets an ability number per section; each question and each family gets a difficulty number on the same scale. This is separate from the skill levels students see.
2. A family starts from its label: level 4 is 0, and each level adds or subtracts 0.6, a guess the data will replace. A new question starts at its family's current number.
3. Expected chance of a right answer: `1 / (1 + e^-(ability - difficulty))` for typed answers, and `0.25 + 0.75 × that` for four choices, since a blind guess is right one time in four.
4. After each counted answer, `surprise = (1 if right, 0 if wrong) - expected chance`. Ability moves up by `K × surprise`; the question and its family move down by `K × surprise`, with `K = 1 / (1 + 0.05 × answers so far)` (Pelánek's suggested start).
5. Count only first tries without a hint, in practice modes. Seeing a close variant makes the next one easier (Morley, Bridgeman and Lawless, 2004), so skip answers given soon after a sibling.

Endless then serves questions whose expected chance is near the founder's 75% target.

**Flags for the admin.**

- _Label off:_ at 100 counted answers (enough to pin a difficulty within about half a point; Linacre, 1994), turn the family's number back into a level. More than one level from its label means relabel it ("labeled 3, plays like 5").
- _Sibling off:_ a question more than one point from its family after 50 answers gets a human look (College Board's stricter rule needs 1,000 answers per question).
- _Likely broken:_ weaker students get it right more often than stronger ones, or stronger students favor one wrong choice. Hide it and list it.
- _Monthly check:_ once families pass a few hundred answers, fit a Rasch model offline with the free R package mirt and compare it with the Elo numbers.

## Risks and how we guard against them

| Risk                               | Guard before students see it                                                                                         | Guard after students answer                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Wrong key                          | Math: exact arithmetic, then a check by another route. Reading and Writing: a blind solver must reach the key, twice | Flag questions weaker students get right more often  |
| Two right answers                  | Math: the check must reject every wrong choice. Reading and Writing: the auditor says why each wrong choice fails    | Flag a wrong choice that stronger students favor     |
| Answerable without reading         | Solve with the passage hidden; if that works, bin it                                                                 | Flag questions far easier than their family          |
| False facts or silly numbers       | Real-world number ranges; invented studies and people, never claims about real living people                         | Student reports                                      |
| Copying the bank, the SAT or books | Near-duplicate search against every question; flag any 13-word run in common                                         | Admin review of reports                              |
| Bias or upsetting content          | Writer and auditor follow the ETS topics-to-avoid list; varied names and settings; no stereotypes                    | Student reports                                      |
| Repeats, memorized templates       | Near-duplicate search among generated items; many templates per skill; a cap per variant; no two siblings in a row   | Recent siblings are recorded and left out of ratings |
| Checkers share blind spots         | A separate, blind checker; code rules first; planted bad questions; a small human spot check                         | The data flags above                                 |
| A generated question in an exam    | The database rule allows generated questions only in the practice pool                                               | None needed                                          |

Built tonight: the Math checks, the blind answer, audit and judge for Reading and Writing, near-duplicate removal and the database rule. Everything else in the table, including every guard after students answer, is recommended and not built yet. And passing every check shows a question is correct, not that it measures the skill well; only student answers can show that (Meador, 2026).

## What to do next

1. Save what calibration needs on every answer: question and seed, mode, position, first try, hint, time, and siblings seen recently. Without this, nothing can be calibrated later.
2. Build the Elo ratings and the four admin flags.
3. Hand-check a small random sample of every batch (for example 20 questions), Reading and Writing first.
4. Test the checkers: hide a few known-bad questions in each batch and count how many are caught.
5. Add exposure rules to Endless: no two siblings in a row, and families spaced out.
6. Grow by families, not by count. Math reaches 200,000 by seeds alone, so variety is the real limit: add templates and variants where the bank is thin, especially hard ones. Reading and Writing grows only as fast as checking allows.
7. Run the monthly Rasch check, and retire families whose siblings do not play alike.

## Sources

College Board and testing companies

- [College Board, Digital SAT Suite of Assessments Technical Manual (September 2026), sections 2, 3.1.1 and 6.4](https://research.collegeboard.org/media/pdf/Digital%20SAT%20Suite%20of%20Assessments%20Technical%20Manual-FINAL.pdf)
- [ETS Guidelines for Developing Fair Tests and Communications (2022), section 7](https://www.ets.org/content/dam/ets-org/pdfs/about/fair-tests-and-communications.pdf)
- [Attali, Runge, LaFlair and others (2022), The interactive reading task: transformer-based automatic item generation, Frontiers in Artificial Intelligence](https://www.frontiersin.org/articles/10.3389/frai.2022.903077)

Item models

- [Gierl, Zhou and Alves (2008), Developing a taxonomy of item model types to promote assessment engineering, Journal of Technology, Learning, and Assessment 7(2)](https://ejournals.bc.edu/index.php/jtla/article/view/1629)
- [Gierl, Lai and Turner (2012), Using automatic item generation to create multiple-choice test items, Medical Education 46(8)](https://doi.org/10.1111/j.1365-2923.2012.04289.x)
- [Gierl and Lai (2013), NCME ITEMS module: Using automated processes to generate test items](https://ncme.org/wp-content/uploads/2025/10/Module-34-Automated-Item-Generation-Gierl-Lai.pdf)
- [Gierl and Haladyna, editors (2013), Automatic Item Generation: Theory and Practice, Routledge](https://www.routledge.com/Automatic-Item-Generation-Theory-and-Practice/Gierl-Haladyna/p/book/9780415897518)
- [Embretson (1998), A cognitive design system approach to generating valid tests, Psychological Methods 3(3)](https://doi.org/10.1037/1082-989X.3.3.380)
- [Bejar, Lawless, Morley and others (2003), A feasibility study of on-the-fly item generation in adaptive testing, Journal of Technology, Learning, and Assessment](https://www.ejournals.bc.edu/index.php/jtla/article/view/1663)
- [Fu, Choe, Lim and Choi (2022), An evaluation of automatic item generation: a case study of weak theory approach, Educational Measurement: Issues and Practice 41(4)](https://doi.org/10.1111/emip.12529)
- [Circi, Hicks and Sikali (2023), Automatic item generation: foundations and machine learning-based approaches for assessments, Frontiers in Education](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.858273/full)
- [Meador (2026), From expert approval to validity evidence: evaluating AI-generated assessment items, AIME-Con 2026](https://aclanthology.org/2026.aimecon-sessions.18/)

Helper-written questions and checks

- [Artsi, Sorin, Konen and others (2024), Large language models for generating medical examinations: systematic review, BMC Medical Education 24](https://doi.org/10.1186/s12909-024-05239-y)
- [Bhandari, Liu, Kwak and Pardos (2024), Evaluating the psychometric properties of ChatGPT-generated questions, Computers and Education: Artificial Intelligence 7](https://doi.org/10.1016/j.caeai.2024.100284)
- [Liu, Bhandari and Pardos (2024), Leveraging LLM-respondents for item evaluation: a psychometric analysis](https://arxiv.org/abs/2407.10899)
- [Alberti, Andor, Pitler, Devlin and Collins (2019), Synthetic QA corpora generation with roundtrip consistency, ACL](https://aclanthology.org/P19-1620/)
- [Mishra, Poesia and Goodman, MathCAMPS: fine-grained synthesis of mathematical problems from human curricula (COLM 2025)](https://arxiv.org/abs/2407.00900)
- [Zheng and others (2023), Judging LLM-as-a-judge with MT-Bench and Chatbot Arena, NeurIPS](https://arxiv.org/abs/2306.05685)
- [Panickssery, Bowman and Feng (2024), LLM evaluators recognize and favor their own generations, NeurIPS](https://arxiv.org/abs/2404.13076)
- [Wang and others (2023), Self-consistency improves chain of thought reasoning in language models, ICLR](https://arxiv.org/abs/2203.11171)
- [Gao and others (2023), PAL: program-aided language models, ICML](https://proceedings.mlr.press/v202/gao23f.html)
- [Moore, Nguyen, Chen and Stamper (2023), Assessing the quality of multiple-choice questions using GPT-4 and rule-based methods, EC-TEL](https://arxiv.org/abs/2307.08161)
- [Haladyna, Downing and Rodriguez (2002), A review of multiple-choice item-writing guidelines for classroom assessment, Applied Measurement in Education 15(3)](https://doi.org/10.1207/S15324818AME1503_5)
- [Säuberli and Clematide (2024), Automatic generation and evaluation of reading comprehension test items with large language models, READI workshop](https://aclanthology.org/2024.readi-1.3)
- [Carlini, Ippolito, Jagielski and others (2023), Quantifying memorization across neural language models, ICLR](https://arxiv.org/abs/2202.07646)

Wrong choices

- [Brown and Burton (1978), Diagnostic models for procedural bugs in basic mathematical skills, Cognitive Science 2](https://doi.org/10.1207/s15516709cog0202_4)
- [Sadler (1998), Psychometric models of student conceptions in science, Journal of Research in Science Teaching 35(3)](https://users.nber.org/~sewp/events/2004.05.28/Sadler_PsychometricModels.pdf)
- [Gierl, Bulut, Guo and Zhang (2017), Developing, analyzing, and using distractors for multiple-choice tests in education: a comprehensive review, Review of Educational Research 87(6)](https://doi.org/10.3102/0034654317726529)
- [Feng, Lee, McNichols and others (2024), Exploring automated distractor generation for math multiple-choice questions via large language models, Findings of NAACL](https://aclanthology.org/2024.findings-naacl.193)
- [Chen, Liu and Sonkar (2026, preprint), MalruleLib: large-scale executable misconception reasoning with step traces](https://arxiv.org/abs/2601.03217)
- [Tarrant, Ware and Mohammed (2009), An assessment of functioning and non-functioning distractors in multiple-choice questions, BMC Medical Education 9](https://doi.org/10.1186/1472-6920-9-40)

Difficulty

- [Pelánek (2016), Applications of the Elo rating system in adaptive educational systems, Computers and Education 98 (accepted manuscript)](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- [Klinkenberg, Straatemeier and van der Maas (2011), Computer adaptive practice of maths ability using a new item response model for on the fly ability and difficulty estimation, Computers and Education 57(2)](https://doi.org/10.1016/j.compedu.2011.02.003)
- [Glas and van der Linden (2003), Computerized adaptive testing with item cloning, Applied Psychological Measurement 27(4)](https://doi.org/10.1177/0146621603027004001)
- [Sinharay, Johnson and Williamson (2003), Calibrating item families and summarizing the results using family expected response functions, Journal of Educational and Behavioral Statistics 28(4)](https://doi.org/10.3102/10769986028004295)
- [Geerlings, Glas and van der Linden (2011), Modeling rule-based item generation, Psychometrika 76(2)](https://doi.org/10.1007/s11336-011-9204-x)
- [Yaneva, North, Baldwin and others (2024), Findings from the first shared task on automated prediction of difficulty and response time for multiple-choice questions, BEA workshop](https://aclanthology.org/2024.bea-1.39)
- [AlKhuzaey, Grasso, Payne and Tamma (2023), Text-based question difficulty prediction: a systematic review of automatic approaches, International Journal of Artificial Intelligence in Education](https://doi.org/10.1007/s40593-023-00362-1)
- [Benedetto, Cremonesi, Caines and others (2023), A survey on recent approaches to question difficulty estimation from text, ACM Computing Surveys 55(9)](https://doi.org/10.1145/3556538)
- [Holling, Bertling and Zeuch (2009), Automatic item generation of probability word problems, Studies in Educational Evaluation 35](https://doi.org/10.1016/j.stueduc.2009.10.004)
- [Linacre (1994), Sample size and item calibration stability, Rasch Measurement Transactions 7:4](https://www.rasch.org/rmt/rmt74m.htm)
- [Morley, Bridgeman and Lawless (2004), Transfer between variants of quantitative items, ETS Research Report RR-04-36](https://www.ets.org/research/policy_research_reports/publications/report/2004/hyzn.html)
- [Chalmers (2012), mirt: a multidimensional item response theory package for the R environment, Journal of Statistical Software 48(6)](https://doi.org/10.18637/jss.v048.i06)

Near-duplicates

- [Broder (1997), On the resemblance and containment of documents](https://www.cs.princeton.edu/courses/archive/spring13/cos598C/broder97resemblance.pdf)
- [Charikar (2002), Similarity estimation techniques from rounding algorithms, STOC](https://www.cs.princeton.edu/courses/archive/spr04/cos598B/bib/CharikarEstim.pdf)
- [Manku, Jain and Das Sarma (2007), Detecting near-duplicates for web crawling, WWW](https://research.google/pubs/detecting-near-duplicates-for-web-crawling/)
- [Leskovec, Stanford CS246 slides on shingling, MinHash and locality-sensitive hashing (from Mining of Massive Datasets)](https://snap.stanford.edu/class/cs246-2025/WWW/slides/03-lsh.pdf)
- [Lee, Ippolito, Nystrom and others (2022), Deduplicating training data makes language models better, ACL](https://aclanthology.org/2022.acl-long.577)
- [Brown and others (2020), Language models are few-shot learners, NeurIPS supplement, appendix C (13-word overlap test)](https://proceedings.nips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Supplemental.pdf)
- [Reimers and Gurevych (2019), Sentence-BERT: sentence embeddings using Siamese BERT-networks, EMNLP](https://arxiv.org/abs/1908.10084)

Karman notes

- [How College Board sets SAT difficulty (research note, 2026-10-30)](2026-10-bluebook-difficulty-and-adaptivity.md)
- [Overnight build plan, 2026-11-22](../overnight/2026-11-22-portal-complete.md)
