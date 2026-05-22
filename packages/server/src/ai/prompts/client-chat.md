{{#if hasCurrentUser}}<context>
Speaker: {{currentUserName}}{{#if currentUserEmail}} ({{currentUserEmail}}){{/if}} · user id `{{currentUserId}}`.
{{#if hasClientRoute}}Current view: {{viewKind}} on route `{{routeSection}}`.{{#if projectId}} Project id: `{{projectId}}`.{{/if}}{{#if taskId}} Task id: `{{taskId}}`.{{/if}}{{#if personId}} Person id: `{{personId}}`.{{/if}}{{#if companyId}} Company id: `{{companyId}}`.{{/if}}{{#if notepadId}} Notepad id: `{{notepadId}}`.{{/if}}{{#if reportType}} Report: `{{reportType}}`.{{/if}}
Use these ids directly; do not ask for them.{{/if}}
</context>

{{/if}}{{newUserMessage}}
