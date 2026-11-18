# Generated Name Uniqueness

## Requirement

Generated entity names must be unique within each entity type. Name allocation happens while the generator assigns names and is independent of JSON export, Obsidian, or other consumers. Different entity types may share a name; in particular, a polity may share its homeworld's name.

## Generation rule

- Compare names within their generated entity type only, using trimmed, case-insensitive names with repeated whitespace collapsed.
- Resolve a collision when the name is assigned by choosing another candidate. If no candidate remains, generation fails clearly rather than inventing a suffix.
- Derived names must use the already allocated source name. For example, a polity continues to match its homeworld, while system and hosted-object names are derived from the final generated names.

## Obsidian note

Vault path and link naming remains a consumer concern. A vault converter may choose human-readable paths, but it does not own or perform entity-name deduplication.
