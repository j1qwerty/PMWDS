# Knowledge Page

## Purpose

Manage knowledge articles and lessons learned linked to projects.

## Routes

- `/knowledge/articles`
- `/knowledge/lessons`

## APIs Needed

- `GET /knowledge/articles`
- `GET /knowledge/articles?projectId={projectId}`
- `GET /knowledge/articles/{articleId}`
- `POST /knowledge/articles`
- `PUT /knowledge/articles/{articleId}`
- `DELETE /knowledge/articles/{articleId}`
- `GET /knowledge/lessons`
- `GET /knowledge/lessons?projectId={projectId}`
- `POST /knowledge/lessons`
- `PUT /knowledge/lessons/{lessonId}`
- `DELETE /knowledge/lessons/{lessonId}`
- `GET /projects`

## Components Needed

- `KnowledgeArticlesPage`
- `LessonsLearnedPage`
- `KnowledgeFilters`
- `KnowledgeArticleFormModal`
- `LessonLearnedFormModal`

## Interaction Rules

- Project dropdown reuse is required.
- Article and lesson pages should share tag editors and project filters.
