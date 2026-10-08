/**
 * Iconos de la aplicación — servidos desde **Heroicons**.
 *
 * ── Por qué este archivo sigue existiendo ───────────────────────────────────
 *
 * Antes cada icono era un SVG propio (`@/icons/plus.svg?react`, etc.) importado
 * con SVGR, y **42 archivos** consumían este barril. Migrar los 42 a pelo
 * significaba tocar cientos de líneas para no cambiar ni un píxel de forma: el
 * mismo trabajo con el mismo riesgo y ninguna ganancia.
 *
 * La migración se hace aquí: el barril **re-exporta Heroicons** con los nombres
 * que el proyecto ya usaba. Los consumidores no cambian una línea y todo lo que
 * se pinta sale del catálogo de Heroicons.
 *
 * ── Por qué hay alias ───────────────────────────────────────────────────────
 *
 * Los nombres propios no siempre coinciden con los de Heroicons (`TrashBinIcon`
 * → `TrashIcon`, `TimeIcon` → `ClockIcon`). Se conserva el nombre del proyecto
 * para no romper a quien lo importa; el alias es la traducción, y está a la
 * vista en una sola línea.
 *
 * ── Lo que NO se hace aquí ──────────────────────────────────────────────────
 *
 * Los `<svg>` escritos en línea dentro de un JSX (66 archivos) no pasan por este
 * barril y hay que migrarlos uno a uno donde sean iconos de interfaz. Este
 * archivo solo cubre lo que se importaba de `@/icons`.
 *
 * Los `.svg` de `src/icons/` quedan en disco sin consumidores: son assets, no
 * código, y borrarlos no aporta nada al bundle porque Vite no los emite si
 * nadie los importa.
 */

export {
  // ── acciones ──────────────────────────────────────────────────────────────
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon as CloseIcon,
  XMarkIcon as CloseLineIcon,
  CheckIcon as CheckLineIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon as TrashBinIcon,
  DocumentDuplicateIcon as CopyIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronDoubleDownIcon as AngleDoubleDownIcon,
  ChevronDoubleUpIcon as AngleDoubleUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon as AngleUpIcon,
  ChevronDownIcon as AngleDownIcon,
  EllipsisHorizontalIcon as MoreDotIcon,
  EllipsisHorizontalIcon as HorizontaLDots,
  // El menú de una tarjeta va en vertical: tres puntos en fila se leen como
  // «más opciones de la barra», no como el menú de ESE elemento.
  EllipsisVerticalIcon as MoreDotsIcon,
  // El engranaje de «ajustes de este elemento». No estaba en el barril y por eso
  // las tarjetas de `/equipo` lo dibujaban a mano en un `<svg>` en línea.
  Cog6ToothIcon as SettingsGearIcon,

  // ── estado y aviso ────────────────────────────────────────────────────────
  ExclamationCircleIcon as AlertIcon,
  ExclamationTriangleIcon as AlertHexaIcon,
  XCircleIcon as ErrorIcon,
  XCircleIcon as ErrorHexaIcon,
  InformationCircleIcon as InfoIcon,
  BoltIcon,
  SparklesIcon as ShootingStarIcon,
  SparklesIcon as AiIcon,

  // ── objetos y módulos ─────────────────────────────────────────────────────
  ArchiveBoxIcon as BoxIcon,
  CubeIcon as BoxIconLine,
  CubeIcon as BoxCubeIcon,
  CubeTransparentIcon as BoxMoving,
  ArchiveBoxArrowDownIcon as BoxTapped,
  TruckIcon as TruckDelivery,
  ShoppingCartIcon as CartIcon,
  PuzzlePieceIcon as PlugInIcon,
  BookOpenIcon as DocsIcon,
  DocumentIcon as FileIcon,
  DocumentTextIcon as PageIcon,
  FolderIcon,
  Squares2X2Icon as GridIcon,
  ListBulletIcon as ListIcon,
  TableCellsIcon as TableIcon,
  ChartPieIcon as PieChartIcon,

  // ── identidad de la organización (configuración › General) ────────────────
  // Tres metáforas distintas para tres bloques que no deben confundirse:
  // con qué nombre te conocen (`Identification`), dónde operas (`GlobeAlt`) y
  // qué negocio eres (`BuildingStorefront`).
  IdentificationIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,

  // ── gestión de roles y permisos (configuración › Equipo) ──────────────────
  // Tres metáforas para tres bloques que no deben confundirse: quién es la
  // persona (`IdentificationIcon`, arriba), qué rol tiene (`KeyIcon`) y qué
  // capacidades efectivas resultan (`AdjustmentsHorizontalIcon`). El «volver»
  // a los valores del rol usa `ArrowUturnLeftIcon` en vez de un chevron: no es
  // navegación, es deshacer.
  KeyIcon,
  AdjustmentsHorizontalIcon,
  ArrowUturnLeftIcon,

  // ── rubros del negocio (configuración › General › tipo de empresa) ────────
  // Ocho metáforas para ocho rubros, todas de Heroicons 24/outline. El selector
  // de tipo de empresa dejó de ser un desplegable y ahora pinta los ocho a la
  // vez: sin un icono por rubro, ocho etiquetas de texto en fila no se
  // distinguen de un párrafo.
  //
  // `BuildingStorefrontIcon` (arriba) sirve a «Retail & Comercio minorista», que
  // es también el rubro por defecto: se reutiliza a propósito para no tener dos
  // formas del mismo concepto.
  FireIcon as FoodIcon,
  SparklesIcon as FashionIcon,
  BuildingOffice2Icon as ServicesIcon,
  HeartIcon as HealthIcon,
  WrenchScrewdriverIcon as ConstructionIcon,
  Squares2X2Icon as OtherRubroIcon,

  // ── personas y comunicación ───────────────────────────────────────────────
  UsersIcon as GroupIcon,
  UserIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ChatBubbleLeftIcon as ChatIcon,
  EnvelopeIcon,
  EnvelopeIcon as MailIcon,
  PhoneIcon as CallIcon,
  PaperAirplaneIcon as PaperPlaneIcon,

  // ── tiempo, acceso y media ────────────────────────────────────────────────
  ClockIcon as TimeIcon,
  CalendarDaysIcon as CalenderIcon,
  LockClosedIcon as LockIcon,
  EyeIcon,
  EyeSlashIcon as EyeCloseIcon,
  SpeakerWaveIcon as AudioIcon,
  VideoCameraIcon as VideoIcon,
  ClipboardDocumentListIcon as TaskIcon,
  CurrencyDollarIcon as DollarLineIcon,

  // Rubros del negocio: trazos que aún no estaban en el barrel.
  FireIcon,
  BuildingOffice2Icon,
  HeartIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
