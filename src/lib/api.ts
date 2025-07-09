import axios from 'axios';

/**
 * @file api.ts
 */

/**
 * @description This file contains functions to fetch data from the Strapi API.
 */

// lib/api.ts

async function secureFetch(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/${endpoint}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    }
  );

  if (!res.ok) {
    console.error(res);
    throw new Error(`Erreur ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchClientsUser(userId: number) {
  return secureFetch(`clients?populate=*&filters[users][$eq]=${userId}`);
}

export async function fetchNumberOfClientsUser(userId: number) {
  const res = await secureFetch(
    `clients?populate=*&filters[users][$eq]=${userId}`
  );
  return res.data.length;
}

export async function fetchProjectsUser(userId: number) {
  return secureFetch(`projects?populate=*&filters[user][$eq]=${userId}`);
}

export async function fetchNumberOfProjectsUser(userId: number) {
  const res = await secureFetch(
    `projects?populate=*&filters[user][$eq]=${userId}`
  );
  return res.data.length;
}

export async function fetchClientById(id: string) {
  const intId = parseInt(id, 10); // Convertir l'ID en entier
  return secureFetch(`clients/${intId}?populate=*`);
}

export async function fetchProspectsUser(userId: number) {
  return secureFetch(`prospects?populate=*&filters[users][$eq]=${userId}`);
}

export async function fetchProspectById(id: string) {
  const intId = parseInt(id, 10); // Convertir l'ID en entier
  return secureFetch(`prospects/${intId}?populate=*`);
}

export async function fetchNumberOfProspectsUser(userId: number) {
  try {
    const res = await secureFetch(
      `prospects?populate=*&filters[users][$eq]=${userId}`
    );
    return res.data.length;
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
    if (res.data.error?.message === 'Invalid identifier or password') {
      throw new Error('Identifiants invalides');
    } else {
      throw new Error('Erreur lors de la connexion');
    }
  }

  return res.data;
}

export async function fetchLogout() {
  return secureFetch('auth/logout');
}

export async function fetchUserById(userId: number) {
  try {
    return secureFetch(`users/${userId}?populate=*`);
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error; // Re-throw the error for further handling
  }
}

export async function fetchPlans() {
  return secureFetch('plans?populate=*');
}

export async function fetchFacturesUser(userId: number) {
  return secureFetch(`factures?populate=*&filters[user][$eq]=${userId}`);
}

export async function fetchMentors() {
  return secureFetch('mentors?populate=*');
}

export async function fetchNumberOfMentors() {
  const res = await secureFetch('mentors?populate=*');
  return res.data.length;
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
  // Vérifier si localStorage est disponible (côté client)
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  const res = await axios.put(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${userId}`,
    data,
    {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );
  if (res.status !== 200) {
    throw new Error("Erreur lors de la mise à jour de l'utilisateur");
  }
  return res.data;
}
