import axios from "axios";

/**
 * @file api.ts
 */

/**
 * @description This file contains functions to fetch data from the Strapi API.
 */


export async function fetchClients() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/clients?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération des clients");
    }
    return res.json();
}

export async function fetchNumberOfClients() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/clients?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du nombre de clients");
    }
    const data = await res.json();
    return data.data.length;
}


export async function fetchProjects() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/projects?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération des projets");
    }
    return res.json();
}

export async function fetchNumberOfProjects() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/projects?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du nombre de projets");
    }
    const data = await res.json();
    return data.data.length;
}


export async function fetchClientById(id: string) {
    console.log(`Fetching client with ID: ${id}`); // Ajoute un log ici pour vérifier l'ID

    const intId = parseInt(id, 10); // Convertir l'ID en entier
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337"}/api/clients?id=${intId}?populate=*`
    );
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du client");
    }
    const data = await res.json();

    // Si data.data est un tableau, renvoie le premier élément
    return data.data && data.data.length > 0 ? data.data[0] : null;
}

export async function fetchProspects() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/prospects?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération des prospects");
    }
    return res.json();
}

export async function fetchProspectById(id: string) {
    console.log(`Fetching prospect with ID: ${id}`); // Ajoute un log ici pour vérifier l'ID

    const intId = parseInt(id, 10); // Convertir l'ID en entier
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337"}/api/prospects?id=${intId}?populate=*`
    );
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du prospect");
    }
    const data = await res.json();

    // Si data.data est un tableau, renvoie le premier élément
    return data.data && data.data.length > 0 ? data.data[0] : null;
}

export async function fetchNumberOfProspects() {

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/prospects?populate=*`);
        const data = await res.json();
        return data.data.length;
    } catch (error) {
        console.error("Error fetching number of prospects:", error);
        throw new Error("Erreur lors de la récupération du nombre de prospects");
    }
}

export async function fetchLogin(username: string, password: string) {

    const res = await axios.post(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/auth/local`, {
        identifier: username,
        password: password,
    });
    if (res.status !== 200) {
        throw new Error("Erreur lors de la connexion");
    }
    return res.data;
}

export async function fetchUsers() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/users?populate=*`);
    return res.json();
}

export async function fetchUserById(userId: number) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/users?id=${userId}&populate=*`);
        // Check if the response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Read the response body once
        const rawResponse = await response.text();
        // Parse the response as JSON
        return JSON.parse(rawResponse);
    } catch (error) {
        console.error("Failed to fetch user by ID:", error);
        throw error; // Re-throw the error for further handling
    }
}

export async function fetchMentors() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/mentors?populate=*`);

    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération des mentors");
    }
    return res.json();
}
//fetch number of users
export async function fetchNumberOfUsers() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/users/count`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du nombre d'utilisateurs");
    }
    return res.json();
}

export async function fetchNumberOfMentors() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/mentors?populate=*`);
    if (!res.ok) {
        console.error(res);
        throw new Error("Erreur lors de la récupération du nombre de mentors");
    }
    const data = await res.json();
    return data.data.length;
}