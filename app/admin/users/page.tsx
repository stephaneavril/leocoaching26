"use client";

import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser() {
    await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    loadUsers();
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch("/api/users", {
      method: "PATCH",
      body: JSON.stringify({ id, active }),
    });
    loadUsers();
  }

  async function deleteUser(id: number) {
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Administración de Usuarios</h1>

      <div style={{ marginTop: 20, padding: 20, border: "1px solid #ddd" }}>
        <h2>Crear usuario</h2>
        <input
          placeholder="Nombre"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Correo"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
        </select>
        <button onClick={createUser}>Crear</button>
      </div>

      <h2 style={{ marginTop: 40 }}>Usuarios</h2>

      <table border={1} cellPadding={8} style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? "Activo" : "Inactivo"}</td>
              <td>
                <button
                  onClick={() => toggleActive(u.id, !u.is_active)}
                >
                  {u.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  style={{ color: "red", marginLeft: 10 }}
                  onClick={() => deleteUser(u.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
