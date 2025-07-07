'use client';
import axios from 'axios';

/**
 * @file api.ts
 */

/**
 * @description This file contains functions to fetch data from the Strapi API.
 */

const token = localStorage.getItem('token');

export async function fetchClients() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/clients?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération des clients');
  }
  return res.json();
}

export async function fetchNumberOfClients() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/clients?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération du nombre de clients');
  }
  const data = await res.json();
  return data.data.length;
}

export async function fetchProjects() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/projects?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération des projets');
  }
  return res.json();
}

export async function fetchNumberOfProjects() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/projects?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération du nombre de projets');
  }
  const data = await res.json();
  return data.data.length;
}

export async function fetchClientById(id: string) {
  const intId = parseInt(id, 10); // Convertir l'ID en entier
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/clients/${intId}?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération du client');
  }
  const data = await res.json();

  // Si data.data est un tableau, renvoie le premier élément
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

export async function fetchProspects() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/prospects?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération des prospects');
  }
  return res.json();
}

export async function fetchProspectById(id: string) {
  const intId = parseInt(id, 10); // Convertir l'ID en entier
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/prospects/${intId}?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération du prospect');
  }
  const data = await res.json();

  // Si data.data est un tableau, renvoie le premier élément
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

export async function fetchNumberOfProspects() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/prospects?populate=*`
    );
    if (!res.ok) {
      console.error(res);
      throw new Error('Erreur lors de la récupération du nombre de prospects');
    }
    const data = await res.json();
    return data.data.length;
  } catch (error) {
    console.error('Error fetching number of prospects:', error);
    throw new Error('Erreur lors de la récupération du nombre de prospects');
  }
}

export async function fetchLogin(username: string, password: string) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local`,
    {
      identifier: username,
      password: password,
    }
  );
  if (res.status !== 200) {
    throw new Error('Erreur lors de la connexion');
  }
  return res.data;
}

export async function fetchLogout() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/logout`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la déconnexion');
  }
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users?populate=*`
  );
  return res.json();
}

export async function fetchUserById(userId: number) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${userId}?populate=*`
    );
    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Read the response body once
    return response.json();
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error; // Re-throw the error for further handling
  }
}

export async function fetchMentors() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/mentors?populate=*`
  );

  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération des mentors');
  }
  return res.json();
}
//fetch number of users
export async function fetchNumberOfUsers() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/count`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error("Erreur lors de la récupération du nombre d'utilisateurs");
  }
  return res.json();
}

export async function fetchNumberOfMentors() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/mentors?populate=*`
  );
  if (!res.ok) {
    console.error(res);
    throw new Error('Erreur lors de la récupération du nombre de mentors');
  }
  const data = await res.json();
  return data.data.length;
}

export async function fetchCreateAccount(
  username: string,
  email: string,
  password: string
) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local/register`,
    {
      username: username,
      email: email,
      password: password,
    }
  );
  if (res.status !== 200) {
    switch (res.data.error.message) {
      case 'Email or Username are already taken':
        throw new Error('Username or Email already exists');
      default:
        throw new Error('An error occurred during authentication');
    }
  }
  return res.data;
}

export async function updatedUser(
  userId: number,
  data: {
    username?: string;
    email?: string;
    profile_picture?: {
      url: string;
    };
  }
) {
  const res = await axios.put(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${userId}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (res.status !== 200) {
    throw new Error("Erreur lors de la mise à jour de l'utilisateur");
  }
  return res.data;
}
