import { NavLink } from 'react-router-dom'
import { FaUsers, FaMoneyCheckAlt, FaUndo, FaHistory } from 'react-icons/fa'
import './sidebar.css'

export default function Sidebar({ open }) {
  const linkClass = ({ isActive }) => `menu-item ${isActive ? 'active' : ''}`
  return (
    <aside className={`sidebar ${open ? 'expanded' : 'collapsed'}`}>
      <nav className="menu">
        <NavLink className={linkClass} to="/users">
          <FaUsers />
          <span>Utilisateur</span>
        </NavLink>
        <NavLink className={linkClass} to="/deposit">
          <FaMoneyCheckAlt />
          <span>Dépôt</span>
        </NavLink>
        <NavLink className={linkClass} to="/cancel">
          <FaUndo />
          <span>Annuler</span>
        </NavLink>
        <NavLink className={linkClass} to="/history">
          <FaHistory />
          <span>Historique</span>
        </NavLink>
      </nav>
    </aside>
  )
}
