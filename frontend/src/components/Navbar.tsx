import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

const Navbar: React.FC = () => {
  const { logout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">      
        <Link className="navbar-brand" to="/">
          <img src={logo} alt="Trevel Logo" style={{ height: '50px', marginRight: '10px'}} />
          Trevel
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/profile">
                Profile
              </Link>
            </li>
            <li className="nav-item">
            <button className="btn btn-link nav-link" onClick={logout}>Logout</button>
          </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;