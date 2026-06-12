export interface Articulo {
  num: number;
  desc: string;
  texto: string;
}

export interface Capitulo {
  titulo: string;
  articulos: Articulo[];
}

export const estatutosCapitulos: Capitulo[] = [
  {
    titulo: 'TÍTULO I — DENOMINACIÓN, DOMICILIO, DURACIÓN Y MARCO NORMATIVO',
    articulos: [
      { num: 1, desc: 'Denominación', texto: 'Créase la Asociación de Funcionarios SAMU Talcahuano, que podrá usar indistintamente la sigla AFUSAMUT.' },
      { num: 2, desc: 'Naturaleza y base institucional', texto: 'La Asociación se constituye en el marco de la Ley N° 19.296 y se organiza en la esfera del Servicio de Salud Talcahuano, particularmente en el dispositivo SAMU, sin fines de lucro.' },
      { num: 3, desc: 'Domicilio', texto: 'El domicilio de la Asociación será la comuna de Talcahuano, sin perjuicio de desarrollar actividades en las comunas y bases operativas que integren el SAMU del Servicio de Salud Talcahuano.' },
      { num: 4, desc: 'Duración', texto: 'La Asociación tendrá duración indefinida, mientras no se disuelva conforme a la ley y a estos Estatutos.' },
      { num: 5, desc: 'Marco normativo', texto: 'La Asociación se regirá por la Ley N° 19.296, por los dictámenes y criterios interpretativos de la Dirección del Trabajo, y por el presente Estatuto.' },
    ],
  },
  {
    titulo: 'TÍTULO II — PRINCIPIOS Y FINALIDADES',
    articulos: [
      { num: 6, desc: 'Principios rectores', texto: 'La Asociación orientará su actuación por los principios de: democracia interna, participación, transparencia, probidad, no discriminación, respeto interprofesional, protección de derechos laborales, seguridad del trabajador sanitario, salud mental laboral y fortalecimiento del sistema prehospitalario.' },
      { num: 7, desc: 'Finalidad general', texto: 'Representar, promover y defender los intereses laborales, profesionales, de seguridad y bienestar de sus afiliados/as, y contribuir al fortalecimiento del SAMU como dispositivo crítico de salud pública.' },
      { num: 8, desc: 'Finalidades específicas', texto: 'Son finalidades de la Asociación: representar a afiliados ante autoridades del Servicio de Salud, velar por condiciones dignas y seguras de trabajo, promover capacitación, y celebrar convenios de salud y bienestar.' },
    ],
  },
  {
    titulo: 'TÍTULO III — DE LOS SOCIOS',
    articulos: [
      { num: 9, desc: 'Afiliación', texto: 'Podrán afiliarse los funcionarios/as que presten servicios en el SAMU del Servicio de Salud Talcahuano. Se entenderá por funcionarios a quienes se desempeñen en calidad de titularidad y contrata para la conformación, pudiendo incorporarse posteriormente reemplazos.' },
      { num: 10, desc: 'Derechos de los socios', texto: 'Son derechos mínimos: participar con derecho a voz y voto en asambleas; elegir y ser elegido para cargos; solicitar apoyo gremial y representación; acceder a información financiera y actas de la organización.' },
      { num: 11, desc: 'Deberes de los socios', texto: 'Respetar estos Estatutos y acuerdos válidos; mantener conducta compatible con los fines de la Asociación; pagar oportunamente las cuotas; cuidar el patrimonio institucional.' },
      { num: 12, desc: 'Pérdida de calidad de socio', texto: 'Se pierde por: renuncia escrita, dejar de pertenecer al ámbito institucional (SAMU Talcahuano), o expulsión fundada ratificada por la Asamblea General conforme al debido proceso.' },
    ],
  },
  {
    titulo: 'TÍTULO IV — DE LAS ASAMBLEAS',
    articulos: [
      { num: 13, desc: 'Órgano superior', texto: 'La Asamblea General constituye el órgano resolutivo superior de la Asociación. Sus sesiones podrán celebrarse de manera presencial o telemática, debiendo quedar grabadas.' },
      { num: 14, desc: 'Tipos de asamblea', texto: 'Habrá Asambleas Ordinarias (al menos una vez al año) y Extraordinarias convocadas por el Directorio.' },
      { num: 16, desc: 'Quórum y acuerdos', texto: 'En primera citación: mayoría absoluta de socios. En segunda citación: con socios presentes. Los acuerdos se adoptan por mayoría simple de los presentes.' },
    ],
  },
  {
    titulo: 'TÍTULO V — DEL DIRECTORIO',
    articulos: [
      { num: 18, desc: 'Dirección', texto: 'La Asociación será dirigida por un Directorio ajustado al artículo 17 de la Ley N° 19.296. Durará dos (2) años en sus funciones.' },
      { num: 19, desc: 'Integración funcional', texto: 'La Asociación procurará una integración representativa de los estamentos: Enfermería, TENS, Conductores y Administrativos.' },
      { num: 23, desc: 'Presidente', texto: 'Representar judicial y extrajudicialmente a la Asociación, convocar y presidir asambleas, supervisar el funcionamiento de las áreas.' },
      { num: 24, desc: 'Secretario', texto: 'Llevar el registro actualizado de afiliados, redactar y custodiar actas, coordinar procesos eleccionarios.' },
      { num: 25, desc: 'Tesorero', texto: 'Administrar recursos financieros, llevar la contabilidad, efectuar rendiciones de cuenta semestrales.' },
    ],
  },
  {
    titulo: 'TÍTULO VI — PATRIMONIO Y FINANZAS',
    articulos: [
      { num: 26, desc: 'Administración y transparencia', texto: 'El Directorio administrará los fondos mediante cuenta bancaria única. Se presentará informe financiero semestral y se constituirá una Comisión Revisora de Cuentas elegida por Asamblea.' },
      { num: 28, desc: 'Cuota ordinaria', texto: 'La cuota ordinaria mensual inicial será de $4.000 CLP (cuatro mil pesos), reajustada automáticamente cada dos años según IPC acumulado. Descuento aplicable por planilla o transferencia.' },
    ],
  },
];
