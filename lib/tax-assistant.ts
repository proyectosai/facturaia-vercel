export const TAX_ASSISTANT_OFFICIAL_LINKS = [
  {
    title: "Campaña de Renta en la AEAT",
    href: "https://sede.agenciatributaria.gob.es/Sede/Renta.html",
    description:
      "Portal oficial con acceso a Renta WEB, datos fiscales, manuales y servicios de ayuda.",
  },
  {
    title: "Gestiones IRPF",
    href: "https://sede.agenciatributaria.gob.es/Sede/irpf/gestiones-irpf.html",
    description:
      "Acceso a expediente, datos fiscales, modificación de declaraciones y trámites de IRPF.",
  },
  {
    title: "Renta WEB",
    href: "https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/servicios-ayuda-confeccionar-renta/renta-web.html",
    description:
      "Servicio oficial para confeccionar, revisar y presentar la declaración de Renta.",
  },
  {
    title: "Renta WEB Open",
    href: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/renta-web-open.html",
    description:
      "Simulador oficial sin presentación, útil para preparar escenarios y contrastar supuestos.",
  },
  {
    title: "Manual práctico IRPF 2024",
    href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/IRPF/IRPF-2024/ManualRenta2024Tomo1_gl_es.pdf",
    description:
      "Manual práctico oficial con casuística, criterios y novedades del ejercicio.",
  },
] as const;

export const TAX_ASSISTANT_QUICK_PROMPTS = [
  "Prepárame una checklist de documentación para una renta de un autónomo en estimación directa.",
  "Qué riesgos debo revisar antes de presentar una renta con alquileres y deducciones autonómicas.",
  "Ayúdame a ordenar un expediente con ganancias patrimoniales por venta de acciones o criptoactivos.",
  "Qué información me falta para revisar una renta conjunta con hijos y mínimos familiares.",
] as const;

export const TAX_ASSISTANT_CHECKLIST_GROUPS = [
  {
    title: "Identificación y contexto",
    items: [
      "NIF, estado civil, unidad familiar y cambios relevantes del ejercicio.",
      "Comunidad autónoma y residencia fiscal.",
      "Situación familiar, discapacidad, descendientes y ascendientes a cargo.",
    ],
  },
  {
    title: "Rendimientos y patrimonio",
    items: [
      "Certificados de trabajo, prestaciones, pensiones y retenciones.",
      "Intereses, dividendos, fondos, acciones, criptomonedas y otras ganancias o pérdidas.",
      "Inmuebles, alquileres, referencias catastrales y gastos asociados.",
    ],
  },
  {
    title: "Actividad económica y deducciones",
    items: [
      "Libros, modelos presentados y gastos deducibles si el cliente es autónomo.",
      "Deducciones estatales y autonómicas con soporte documental.",
      "Aportaciones, maternidad, familia numerosa y otras incidencias del ejercicio.",
    ],
  },
] as const;
