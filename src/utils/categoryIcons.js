import {
  FaBriefcase,
  FaBuilding,
  FaBullhorn,
  FaCalendarAlt,
  FaCamera,
  FaChartLine,
  FaChartPie,
  FaCoins,
  FaComments,
  FaFileAlt,
  FaFileInvoiceDollar,
  FaGlobe,
  FaGraduationCap,
  FaHandshake,
  FaHeart,
  FaHome,
  FaImage,
  FaLandmark,
  FaLayerGroup,
  FaLightbulb,
  FaNewspaper,
  FaPalette,
  FaPercentage,
  FaPlayCircle,
  FaRocket,
  FaSeedling,
  FaShieldAlt,
  FaShoppingBag,
  FaStar,
  FaTags,
  FaTasks,
  FaThLarge,
  FaTrophy,
  FaUsers,
  FaVideo,
} from 'react-icons/fa'

/** Curated Font Awesome icons for SM Template categories (keys match backend). */
export const CATEGORY_ICON_OPTIONS = [
  { value: 'briefcase', label: 'Briefcase', Icon: FaBriefcase },
  { value: 'building', label: 'Building', Icon: FaBuilding },
  { value: 'bullhorn', label: 'Bullhorn', Icon: FaBullhorn },
  { value: 'calendar', label: 'Calendar', Icon: FaCalendarAlt },
  { value: 'camera', label: 'Camera', Icon: FaCamera },
  { value: 'chart-line', label: 'Chart line', Icon: FaChartLine },
  { value: 'chart-pie', label: 'Chart pie', Icon: FaChartPie },
  { value: 'coins', label: 'Coins', Icon: FaCoins },
  { value: 'comments', label: 'Comments', Icon: FaComments },
  { value: 'file-alt', label: 'File', Icon: FaFileAlt },
  { value: 'file-invoice-dollar', label: 'Invoice', Icon: FaFileInvoiceDollar },
  { value: 'globe', label: 'Globe', Icon: FaGlobe },
  { value: 'graduation-cap', label: 'Graduation', Icon: FaGraduationCap },
  { value: 'handshake', label: 'Handshake', Icon: FaHandshake },
  { value: 'heart', label: 'Heart', Icon: FaHeart },
  { value: 'home', label: 'Home', Icon: FaHome },
  { value: 'image', label: 'Image', Icon: FaImage },
  { value: 'landmark', label: 'Landmark', Icon: FaLandmark },
  { value: 'layer-group', label: 'Layers', Icon: FaLayerGroup },
  { value: 'lightbulb', label: 'Lightbulb', Icon: FaLightbulb },
  { value: 'newspaper', label: 'Newspaper', Icon: FaNewspaper },
  { value: 'palette', label: 'Palette', Icon: FaPalette },
  { value: 'percentage', label: 'Percentage', Icon: FaPercentage },
  { value: 'play-circle', label: 'Play', Icon: FaPlayCircle },
  { value: 'rocket', label: 'Rocket', Icon: FaRocket },
  { value: 'seedling', label: 'Seedling', Icon: FaSeedling },
  { value: 'shield-alt', label: 'Shield', Icon: FaShieldAlt },
  { value: 'shopping-bag', label: 'Shopping', Icon: FaShoppingBag },
  { value: 'star', label: 'Star', Icon: FaStar },
  { value: 'tags', label: 'Tags', Icon: FaTags },
  { value: 'tasks', label: 'Tasks', Icon: FaTasks },
  { value: 'th-large', label: 'Grid', Icon: FaThLarge },
  { value: 'trophy', label: 'Trophy', Icon: FaTrophy },
  { value: 'users', label: 'Users', Icon: FaUsers },
  { value: 'video', label: 'Video', Icon: FaVideo },
]

const ICON_MAP = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.value, opt.Icon])
)

export function getCategoryIconComponent(iconKey) {
  if (!iconKey) return null
  return ICON_MAP[iconKey] || null
}

/** Prefer uploaded image, then font icon, then initial letter. */
export function categoryInitial(name) {
  const text = String(name || '').trim()
  return text ? text.charAt(0).toUpperCase() : '?'
}
