# Profiles Page

## Purpose

Manage user profile details separate from core user records.

## Routes

- `/profiles`
- `/profiles/:userId`
- `/my-profile`

## APIs Needed

- `GET /users`
- `GET /profiles/{userId}`
- `PUT /profiles/{userId}`

## Page Structure

- Profile directory list or selector
- User profile detail page
- Current user shortcut page

## UI Elements

- User search
- Department filter if available through users payload
- Avatar placeholder
- Contact section
- Bio and social section

## Components Needed

- `ProfileDirectoryPage`
- `ProfileSelector`
- `ProfileDetailPage`
- `ProfileCard`
- `ProfileForm`
- `ProfileMetaSection`
- `ProfileContactSection`

## Form Inputs

- Bio
- Job title
- Date of birth
- Address
- Emergency contact
- LinkedIn URL

## Interaction Rules

- Selecting a user loads profile detail.
- If a profile does not exist in payload terms, show editable empty state.
- Reuse profile card in user detail contexts later.
