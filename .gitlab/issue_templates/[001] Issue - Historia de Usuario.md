> Englobar cambios que sean QOL para el desarrollo o para los entornos asociados, como el repositorio de GitLab. Englobar también las actualizaciones de paquetería generales.

### Cuándo se ha completado (_definition of done_)

Ver criterios de aceptación.

### Criterios de aceptación

```json:table
{
  "type": "acceptance_criteria",
  "fields": [
    {"key": "iid", "labelm": "Id int.", "sortable": true},
    {"key": "given", "label": "Dado"},
    {"key": "when", "label": "Cuando"},
    {"key": "then", "label": "Entonces"},
    {"key": "assessment_result", "label": "Valid. manual"},
    {"key": "assessment_description", "label": "Evaluación"},
    {"key": "class", "label": "Clasif.", "sortable": true},
    {"key": "tags", "label": "Tags", "sortable": true},
    {"key": "active", "label": "Activo", "sortable": true}
  ],
  "items": [
    {
      "iid": 1,
      "given": "Un repositorio de código",
      "when": "un desarrollador quiera escribir una issue",
      "then": "tendrá disponibles unas plantillas para facilitar la tarea",
      "assessment_result": null,
      "assessment_description": "",
      "class": "",
      "tags": "",
      "active": "X"
    },
    {
      "iid": 2,
      "given": "Un informe sobre los paquetes no actualizados de las aplicaciones",
      "when": "",
      "then": "se intentará mantener actualizados los paquetes",
      "assessment_result": null,
      "assessment_description": "",
      "class": "",
      "tags": "",
      "active": "X"
    }
  ],
  "caption": "Criterios de aceptación (ver detalles de la evaluación manual en los comentarios)",
  "filter": true
}
```

/label ~"t::user_story"
