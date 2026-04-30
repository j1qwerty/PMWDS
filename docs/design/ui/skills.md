# Skills Page

## Purpose

Manage skills and user-skill mapping for staffing, profiles, and assignment support.

## Routes

- `/skills`

## APIs Needed

- `GET /skills`
- `POST /skills`
- `PUT /skills/{skillId}`
- `DELETE /skills/{skillId}`
- `GET /users`
- user skill endpoints if available in existing API

## Page Structure

- Skills directory
- User skill matrix

## Components Needed

- `SkillListPage`
- `SkillTable`
- `SkillFormModal`
- `UserSkillPanel`

## Interaction Rules

- Skill pickers should be reusable later in profiles and user detail pages.
