export function DropdownDivider() {
  return (
    <div className="dropdown-divider">
      <style>{`
        .dropdown-divider {
          height: 1px;
          background: var(--border-color-primary);
          margin: 4px 16px;
        }
      `}</style>
    </div>
  )
}

export default DropdownDivider
