import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaUsers, FaImages, FaShieldAlt, FaExclamationTriangle, FaCheck, FaHeart } from 'react-icons/fa';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  
  // --- ÁLLAPOTOK (STATE) ---
  const [activeTab, setActiveTab] = useState('reports'); // Legyen a Jelentések az alapértelmezett, hogy azonnal lássuk az újakat
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. JOGOSULTSÁG ELLENŐRZÉSE ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    // Ha nincs belépve, vagy nincs token
    if (!userStr || !token) { 
      navigate('/login'); 
      return; 
    }
    
    // Ha be van lépve, de NEM admin
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { 
      alert('Nincs jogosultságod az admin felülethez!');
      navigate('/'); 
      return; 
    }

    // Ha admin, lekérjük az adatokat
    fetchData(token);
  }, [navigate]);

  // --- 2. ADATOK LEKÉRÉSE A BACKENDRŐL ---
  const fetchData = async (token) => {
    setLoading(true);
    try {
      // Felhasználók
      const usersRes = await fetch('http://localhost:3000/api/admin/users', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (usersRes.ok) setUsers(await usersRes.json());

      // Posztok (Galéria végpont újrahasználata)
      const postsRes = await fetch('http://localhost:3000/api/gallery');
      if (postsRes.ok) setPosts(await postsRes.json());

      // Jelentések (Reports)
      const reportsRes = await fetch('http://localhost:3000/api/admin/reports', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (reportsRes.ok) setReports(await reportsRes.json());

    } catch (error) {
      console.error("Hiba az adatok letöltésekor", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. TÖRLÉS ÉS KEZELÉS FÜGGVÉNYEK ---
  
  // Felhasználó törlése
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Biztosan törlöd ezt a felhasználót? Minden posztja és kommentje is végleg törlődni fog!')) return;
    
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      setUsers(users.filter(u => u.id !== id));
      // Frissítjük a posztokat is, hátha az ő posztjai is eltűntek
      fetchData(token); 
    }
  };

  // Poszt törlése
  const handleDeletePost = async (id) => {
    if (!window.confirm('Biztosan törlöd ezt a posztot?')) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/api/admin/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) setPosts(posts.filter(p => p.id !== id));
  };

  // Jelentés lezárása (törlése a listából)
  const handleResolveReport = async (id) => {
    if (!window.confirm('Elintézted a problémát? Biztosan lezárod ezt a jelentést?')) return;
    
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/api/admin/reports/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) setReports(reports.filter(r => r.id !== id));
  };

  // --- TÖLTÉS KÉPERNYŐ ---
  if (loading) return <div style={{textAlign: 'center', marginTop: '50px', color: 'var(--text-primary)'}}>Adatok betöltése folyamatban...</div>;

  return (
    <div className="admin-container">
      
      {/* FEJLÉC */}
      <div className="admin-header">
        <h1><FaShieldAlt style={{color: '#e74c3c'}} /> Adminisztrációs Központ</h1>
      </div>

      {/* FÜLEK (TABS) */}
      <div className="admin-tabs">
        
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          <FaUsers /> Felhasználók ({users.length})
        </button>
        <button className={activeTab === 'posts' ? 'active' : ''} onClick={() => setActiveTab('posts')}>
          <FaImages /> Posztok ({posts.length})
        </button>
        <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
          <FaExclamationTriangle /> Jelentések ({reports.length})
        </button>
      </div>

      {/* TARTALOM */}
      <div className="admin-content">
        
        {/* 1. JELENTÉSEK TÁBLÁZAT */}
        {activeTab === 'reports' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Típus</th>
                <th>Célpont ID</th>
                <th>Bejelentő</th>
                <th>Indoklás</th>
                <th>Dátum</th>
                <th>Művelet</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? (
                reports.map(r => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>
                      <span style={{ 
                        background: r.target_type === 'post' ? '#3498db' : '#9b59b6', 
                        color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' 
                      }}>
                        {r.target_type.toUpperCase()}
                      </span>
                    </td>
                    <td><strong>#{r.target_id}</strong></td>
                    <td>@{r.reporter_name}</td>
                    <td>{r.reason}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="admin-delete-btn" style={{backgroundColor: '#27ae60'}} onClick={() => handleResolveReport(r.id)}>
                        <FaCheck /> Lezárás
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{textAlign:'center', padding: '30px'}}>
                    Nincs új bejelentés. Minden rendben van! 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 2. FELHASZNÁLÓK TÁBLÁZAT */}
        {activeTab === 'users' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Név</th>
                <th>Email</th>
                <th>Szerepkör</th>
                <th>Regisztrált</th>
                <th>Művelet</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role}`}>{u.role.toUpperCase()}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.role !== 'admin' ? (
                      <button className="admin-delete-btn" onClick={() => handleDeleteUser(u.id)}>
                        <FaTrash /> Törlés
                      </button>
                    ) : (
                      <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>Nem törölhető</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 3. POSZTOK TÁBLÁZAT */}
        {activeTab === 'posts' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kép</th>
                <th>Cím</th>
                <th>Feltöltő</th>
                <th>Lájkok</th>
                <th>Művelet</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>
                    <img src={p.image_url} alt="thumbnail" className="admin-thumbnail" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px'}} />
                  </td>
                  <td><strong>{p.title}</strong></td>
                  <td>@{p.username}</td>
                  <td><FaHeart style={{color: '#e74c3c', marginRight: '5px'}}/> {p.like_count || 0}</td>
                  <td>
                    <button className="admin-delete-btn" onClick={() => handleDeletePost(p.id)}>
                      <FaTrash /> Törlés
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
};

export default Admin;