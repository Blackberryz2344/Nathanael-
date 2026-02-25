export type Level = 'Iniciante' | 'Intermediário' | 'Avançado';
export type Language = 'Inglês' | 'Espanhol' | 'Francês' | 'Alemão' | 'Italiano' | 'Japonês' | 'Russo' | 'Vietnamita' | 'Coreano' | 'Português' | 'Alto Valiriano';

export type LessonType = 'conversation' | 'writing';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  level: Level;
  topic: string;
  icon: string;
  baseInstruction: string;
  type: LessonType;
}

export const LANGUAGES: Language[] = ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Japonês', 'Russo', 'Vietnamita', 'Coreano', 'Português', 'Alto Valiriano'];

export const LESSONS: Lesson[] = [
  {
    id: 'greetings',
    title: 'Saudações e Apresentações',
    description: 'Aprenda a cumprimentar pessoas e se apresentar de forma natural.',
    level: 'Iniciante',
    topic: 'Greetings',
    icon: '👋',
    baseInstruction: 'Esta é uma aula de saudações para iniciantes. Ajude o aluno a praticar saudações básicas, como se apresentar e perguntar como alguém está. Corrija a pronúncia e sugira variações formais e informais.',
    type: 'conversation'
  },
  {
    id: 'restaurant',
    title: 'No Restaurante',
    description: 'Pratique como fazer pedidos, perguntar sobre o menu e pagar a conta.',
    level: 'Iniciante',
    topic: 'Restaurant',
    icon: '🍽️',
    baseInstruction: 'O cenário é um restaurante. O aluno deve tentar pedir uma refeição. Ajude com vocabulário de comida e frases essenciais para pedidos e pagamentos.',
    type: 'conversation'
  },
  {
    id: 'numbers',
    title: 'Prática Numérica',
    description: 'Aprenda números, horas, datas e como lidar com dinheiro no dia a dia.',
    level: 'Iniciante',
    topic: 'Numbers',
    icon: '🔢',
    baseInstruction: 'Foque em números, contagem, horas e transações financeiras simples. Peça ao aluno para dizer números específicos ou resolver problemas matemáticos simples no idioma alvo.',
    type: 'conversation'
  },
  {
    id: 'verbs-conjugation',
    title: 'Conjugação e Junção de Verbos',
    description: 'Domine os tempos verbais e como combinar verbos para expressar ações complexas.',
    level: 'Intermediário',
    topic: 'Grammar',
    icon: '🔗',
    baseInstruction: 'Pratique conjugações verbais (presente, passado, futuro) e verbos auxiliares. Ajude o aluno a construir frases usando múltiplos verbos e conectivos.',
    type: 'conversation'
  },
  {
    id: 'sentence-formulation',
    title: 'Formulação de Frases',
    description: 'Aprenda a estruturar seus pensamentos e formular frases naturais para uma conversa fluida.',
    level: 'Intermediário',
    topic: 'Conversation',
    icon: '🗣️',
    baseInstruction: 'Ajude o aluno a estruturar frases complexas. Foque na ordem das palavras, conectivos e como transformar pensamentos em frases gramaticalmente corretas e naturais.',
    type: 'conversation'
  },
  {
    id: 'travel',
    title: 'Viagens e Aeroporto',
    description: 'Prepare-se para sua próxima viagem internacional lidando com imigração e direções.',
    level: 'Intermediário',
    topic: 'Travel',
    icon: '✈️',
    baseInstruction: 'O cenário é um aeroporto ou hotel. Pratique situações de check-in, pedir direções e passar pela imigração. Foque na fluidez e vocabulário específico de viagem.',
    type: 'conversation'
  },
  {
    id: 'job-interview',
    title: 'Entrevista de Emprego',
    description: 'Treine para entrevistas profissionais e aprenda a falar sobre suas habilidades.',
    level: 'Avançado',
    topic: 'Professional',
    icon: '💼',
    baseInstruction: 'Realize uma simulação de entrevista de emprego. Peça ao aluno para falar sobre sua experiência, pontos fortes e objetivos. Forneça feedback sobre entonação profissional e escolha de palavras.',
    type: 'conversation'
  },
  {
    id: 'culture',
    title: 'Cultura e Tradições',
    description: 'Discuta temas culturais profundos e nuances do idioma.',
    level: 'Avançado',
    topic: 'Culture',
    icon: '🎭',
    baseInstruction: 'Discuta aspectos culturais do país onde o idioma é falado. Explore gírias, expressões idiomáticas e etiqueta social.',
    type: 'conversation'
  },
  {
    id: 'writing-basics',
    title: 'Fundamentos da Escrita',
    description: 'Pratique a escrita de frases simples e parágrafos curtos.',
    level: 'Iniciante',
    topic: 'Writing',
    icon: '📝',
    baseInstruction: 'Esta é uma aula de escrita. Peça ao aluno para escrever frases curtas sobre si mesmo, sua rotina ou objetos ao redor. Corrija a ortografia e pontuação.',
    type: 'writing'
  },
  {
    id: 'writing-email',
    title: 'Escrevendo E-mails',
    description: 'Aprenda a escrever e-mails formais e informais de forma clara.',
    level: 'Intermediário',
    topic: 'Writing',
    icon: '📧',
    baseInstruction: 'Pratique a escrita de e-mails. Dê um cenário (ex: marcar uma reunião, agradecer um amigo) e peça ao aluno para redigir a mensagem. Foque na estrutura e tom adequado.',
    type: 'writing'
  },
  {
    id: 'writing-essay',
    title: 'Redação e Argumentação',
    description: 'Desenvolva habilidades para escrever textos longos e defender pontos de vista.',
    level: 'Avançado',
    topic: 'Writing',
    icon: '🖋️',
    baseInstruction: 'Desafie o aluno a escrever um pequeno ensaio ou artigo sobre um tema polêmico ou atual. Corrija a coesão, coerência e uso de vocabulário avançado.',
    type: 'writing'
  }
];

export interface LessonHistory {
  id: string;
  lessonId: string;
  date: string;
  language: Language;
  level: Level;
  transcripts: { role: 'user' | 'model', text: string, translation?: string }[];
}

export interface UserProgress {
  selectedLanguage: Language;
  level: Level;
  completedLessons: string[];
  totalConversations: number;
  lastPerformanceScore: number;
  history: LessonHistory[];
}
