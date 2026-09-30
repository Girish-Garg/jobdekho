// Data, analytics and AI. Same row shape and rules as skill-table-web.js.
export const DATA_SKILLS = [
  ['machine learning', 'Machine learning', ['machine learning', 'machine-learning',
    { re: /(?<![\w.])ML(?!\w)/g, text: 'ml' }]],
  // "DL" is also a driving licence in Indian ads, so it is a spelling a
  // resume may use but never something read out of a posting.
  ['deep learning', 'Deep learning', ['deep learning', 'neural networks', { text: 'dl' }], { implies: ['machine learning'] }],
  ['pytorch', 'PyTorch', ['pytorch'], { implies: ['deep learning'], near: { tensorflow: 0.6 } }],
  ['tensorflow', 'TensorFlow', ['tensorflow'], { implies: ['deep learning'], near: { pytorch: 0.6 } }],
  ['keras', 'Keras', ['keras'], { implies: ['deep learning'] }],
  ['scikit-learn', 'scikit-learn', ['scikit-learn', 'sklearn', 'scikit learn'], { implies: ['machine learning', 'python'] }],
  ['llm', 'LLMs', ['llm', 'llms', 'large language model', 'large language models', 'generative ai', 'genai', 'gen ai']],
  ['rag', 'RAG', ['rag', 'retrieval augmented generation', 'retrieval-augmented generation'], { implies: ['llm'] }],
  ['langchain', 'LangChain', ['langchain', 'langgraph'], { implies: ['llm'] }],
  ['ai agents', 'AI agents', ['ai agents', 'agentic ai', 'agentic'], { implies: ['llm'] }],
  ['prompt engineering', 'Prompt engineering', ['prompt engineering'], { implies: ['llm'] }],
  // "AI" alone is in a third of these ads, so, like "DL", it is a spelling
  // only.
  ['artificial intelligence', 'AI', ['artificial intelligence', { text: 'ai' }]],
  ['nlp', 'NLP', ['nlp', 'natural language processing']],
  ['computer vision', 'Computer vision', ['computer vision', 'image processing']],
  ['opencv', 'OpenCV', ['opencv'], { implies: ['computer vision'] }],
  ['pandas', 'pandas', ['pandas'], { implies: ['python'] }],
  ['numpy', 'NumPy', ['numpy'], { implies: ['python'] }],
  ['statistics', 'Statistics', ['statistics', 'statistical analysis', 'statistical modelling', 'statistical modeling', 'hypothesis testing']],
  // R only as a tech list writes it: "Python, R", "R programming", "R/SAS";
  // never the R of "R&D".
  ['r', 'R', ['r programming', 'rstudio',
    { re: /\bR\b(?=\s*(?:,|\/|and\b|or\b|programming|language|studio))|(?<=[,/]\s?)\bR\b(?![&\w])/g }]],
  ['sas', 'SAS', ['sas']],
  ['spss', 'SPSS', ['spss']],
  ['spark', 'Apache Spark', ['spark', 'apache spark', 'pyspark']],
  ['databricks', 'Databricks', ['databricks'], { implies: ['spark'] }],
  ['hadoop', 'Hadoop', ['hadoop', 'hdfs']],
  ['airflow', 'Airflow', ['airflow', 'apache airflow']],
  ['dbt', 'dbt', ['dbt']],
  ['snowflake', 'Snowflake', ['snowflake'], { near: { bigquery: 0.6, redshift: 0.6 } }],
  ['bigquery', 'BigQuery', ['bigquery', 'big query'], { near: { snowflake: 0.6, redshift: 0.6 } }],
  ['redshift', 'Redshift', ['redshift'], { near: { snowflake: 0.6, bigquery: 0.6 } }],
  ['data warehouse', 'Data warehousing', ['data warehouse', 'data warehousing', 'data warehouses']],
  ['etl', 'ETL', ['etl', 'elt', 'data pipeline', 'data pipelines']],
  ['power bi', 'Power BI', ['power bi', 'powerbi', 'dax'], { near: { tableau: 0.6, looker: 0.5 } }],
  ['tableau', 'Tableau', ['tableau'], { near: { 'power bi': 0.6, looker: 0.5 } }],
  ['looker', 'Looker', ['looker', 'looker studio'], { near: { 'power bi': 0.5, tableau: 0.5 } }],
  // "excel" is also the verb ("excel in a fast-paced team"), so only the
  // capitalised tool counts, and not where a sentence opens with the verb.
  ['excel', 'Excel', ['ms excel', 'microsoft excel', 'advanced excel', 'ms-excel',
    { re: /\bExcel\b(?!\s+(?:in|at|as)\b)/g, text: 'excel' }],
    { near: { 'google sheets': 0.7 } }],
  ['google sheets', 'Google Sheets', ['google sheets'], { near: { excel: 0.7 } }],
  ['vba', 'VBA', ['vba'], { implies: ['excel'] }],
  ['ms office', 'MS Office', ['ms office', 'microsoft office']],
  ['google analytics', 'Google Analytics', ['google analytics', 'ga4']],
]
