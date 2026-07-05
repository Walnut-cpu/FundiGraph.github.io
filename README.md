# FundiGraph
FundiGraph is a retinal disease knowledge graph constructed based on a large language model (NotebookLM and ChatGPT4o), covering 13 categories and 732 types of retinal diseases, including both common and rare ones. 

It covers a total of 22 types of medical entities including Disease, Synonym, Staging and typing, Anatomical location, Examination, Symptom, Physical sign, OCT sign, Gene, Differential diagnosis, Complication, Etiology, Related disease, Treatment (General, Drug, Drug usage, Sugery, Indications and Contraindications), Age of onset, High risk population and Medical history. And covers a total of 17 types of medical relations including Contain, Same as, Classified as, Located in, Requires examination, Has OCT sign, Has symptom, Has physical sign, Related gene, Needs distinguished from, May case, Caused by, Related to, Onset during, Affects population and Related history.

We sincerely invite all medical researchers and medical practitioners to read and use it.

## KG access
We have provided an online access page for FundiGraph. You can access it through the following link: https://neo4j.3446740.xyz/

Besides, you can also choose to deploy the data locally.

## Contents
- `/Dataset` -Store the data information of FundiGraph

## Dataset
We have uploaded various data formats of FundiGraph. Please select the appropriate one according to your needs.
* Excel Document: FundiGraph.xlsx
* CSV Document: FundiGraph_relation.csv

## Requirements
* python==3.8.0
* py2neo==2021.2.4
* tqdm==4.67.1
* pandas==2.0.3
* ipykernel==6.29.5

## Citation
If you use these files for research, please cite our article.

For any clarification, comments, or suggestions please create an issue or contact Haoyu Chen (drchenhaoyu@gmail.com) or Siyani Chen (drsiyanichen@gmail.com).

## License
Creative Commons Attribution-NonCommercial 4.0 International（CC BY-NC 4.0）
