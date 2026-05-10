import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="not-found-container">
      <h1>404</h1>
      <p>页面不存在</p>
      <button onClick={() => navigate('/explore')}>返回首页</button>
      <style>{`
        .not-found-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 80px 20px;
          text-align: center;
          background: var(--bg-color-primary);
          transition: background-color 0.2s ease;
        }
        .not-found-container h1 {
          font-size: 72px;
          font-weight: 700;
          color: var(--primary-color);
          margin: 0 0 16px 0;
        }
        .not-found-container p {
          font-size: 18px;
          color: var(--text-color-secondary);
          margin: 0 0 32px 0;
        }
        .not-found-container button {
          padding: 10px 24px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .not-found-container button:hover {
          background: var(--primary-color-dark);
        }
      `}</style>
    </div>
  )
}
