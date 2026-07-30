# FundiGraph
FundiGraph is a retinal disease knowledge graph constructed based on a large language model, covering 13 categories and 739 types of eye diseases, including both common and rare retinal diseases.

22 tyepes of entities: Disease, Synonym, Staging and Typing, Anatomical Location, Examination, Symptom, Physical Sign, OCT Sign, Gene, Differential Diagnosis, Complication, Etiology, Related Disease, Age of Onset, High-Risk Population, Medical History, as well as treatment-related entities (General Treatment, Drug, Drug Usage, Surgery, Indications, and Contraindications). 

17 types of relations: Contain, Same as, Classified as, Located in, Requires examination, Has OCT sign, Has symptom, Has physical sign, Related gene, Needs distinguished from, May cause, Caused by, Related to, Onset during, Affects population, and Related history), forming a rich relational network of 42,532 semantic triples.

## FundiGraph data
* FundiGraph.xlsx
* FunGraph.csv
* FundiGraph-dump.db

## Requirement
* py2neo==2021.2.4
* tqdm==4.67.1
* pandas==2.0.3
* ipykernel==6.29.5
* python==3.8.0

## Declaration
We encourage and support the use of this dataset for non-commercial research purposes. If you use our data in your work, please cite our manuscript. For any inquiries or further details, feel free to contact Haoyu Chen (haoyuchen@cuhk.edu.hk) and Siyani Chen (drsiyanichen@gmail.com).
