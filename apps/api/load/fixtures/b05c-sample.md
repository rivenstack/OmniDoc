# B-05c ingestion smoke

This bounded fixture mentions `tenant_id`, pgvector, BYOK, and OpenAI.

| Stage | Expected |
| --- | --- |
| enqueue | 0/4 |
| terminal | 4/4 |

```java
Path config = Path.of("/srv/omnidoc/config/app.yml");
```
