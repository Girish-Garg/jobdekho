import { TOOL_TERMS } from '@jobdekho/core/ghost.js'

// The hard skills a posting can name, for the resume tailoring's keyword
// coverage. It starts from the ghost signal's tool list so the two features
// agree on what counts as a named tool, and widens it to what Indian job
// boards actually ask for beyond software: data, design, marketing, finance
// and core engineering roles all pass through the same feed.
//
// Lowercase, matched with core's skillRegex on lowercased text. Bare words
// that are also everyday English ("go", "rest", "less", "notion") and single
// letters ("c", "r") stay out: a term that matches prose would flag an honest
// rewrite as an invented skill, and a single letter matches everywhere.
const MORE_TERMS = [
  'html5', 'css3', 'sass', 'jquery', 'redux', 'next.js', 'nuxt', 'svelte', 'express',
  'express.js', 'nestjs', 'fastapi', 'fastify', 'spring boot', 'hibernate', 'asp.net', 'ruby on rails',
  'react native', 'jetpack compose', 'swiftui', 'xamarin', 'ionic', 'electron',
  'postgres', 'postgresql', 'sqlite', 'oracle', 'mssql', 'sql server', 'dynamodb', 'cassandra',
  'elasticsearch', 'firebase', 'supabase', 'prisma', 'sequelize', 'mongoose', 'nosql',
  'rest api', 'rest apis', 'restful', 'grpc', 'websockets', 'microservices', 'oauth', 'jwt',
  'ci/cd', 'github', 'gitlab', 'bitbucket', 'github actions', 'ansible', 'helm', 'nginx', 'bash',
  'shell scripting', 'powershell', 'prometheus', 'grafana', 'datadog', 'splunk', 'lambda', 'ec2', 's3',
  'jest', 'mocha', 'cypress', 'playwright', 'pytest', 'junit', 'postman', 'appium', 'testng',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'llm', 'langchain', 'hugging face',
  'scikit-learn', 'sklearn', 'keras', 'xgboost', 'matplotlib', 'seaborn', 'jupyter', 'airflow',
  'dbt', 'databricks', 'bigquery', 'redshift', 'hive', 'pyspark', 'etl', 'data warehousing',
  'looker', 'metabase', 'google sheets', 'vba', 'sas', 'spss', 'stata', 'r programming',
  'adobe xd', 'sketch', 'invision', 'after effects', 'premiere pro', 'lightroom', 'indesign',
  'coreldraw', 'wireframing', 'prototyping', 'user research',
  'sem', 'google ads', 'meta ads', 'facebook ads', 'hubspot', 'mailchimp', 'semrush', 'ahrefs',
  'content writing', 'copywriting', 'social media marketing', 'email marketing', 'canva',
  'zoho', 'quickbooks', 'gst', 'tds', 'ms office', 'ms excel', 'advanced excel', 'power query',
  'pivot tables', 'financial modelling', 'financial modeling', 'bookkeeping', 'auditing',
  'catia', 'ansys', 'revit', 'staad pro', 'etabs', 'primavera', 'ms project', 'plc', 'scada',
  'embedded c', 'arduino', 'raspberry pi', 'verilog', 'vhdl', 'matlab simulink', 'iot',
  'agile', 'scrum', 'confluence', 'trello', 'six sigma', 'lean manufacturing',
]

export const SKILL_TERMS = [...new Set([...TOOL_TERMS, ...MORE_TERMS])]
