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
  ChevronLeftIcon,
  ChevronUpIcon as AngleUpIcon,
  ChevronDownIcon as AngleDownIcon,
  EllipsisHorizontalIcon as MoreDotIcon,
  EllipsisHorizontalIcon as HorizontaLDots,

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

  // ── personas y comunicación ───────────────────────────────────────────────
  UsersIcon as GroupIcon,
  UserIcon,
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
} from "@heroicons/react/24/outline";
