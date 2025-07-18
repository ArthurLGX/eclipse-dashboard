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

//CLIENTS
export async function addClientUser(
  userId: number,
  data: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
  }
) {
  return secureFetch('clients', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        ...data,
        users: userId,
      },
    }),
  });
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

  //CLIENTS
}

export async function fetchClientById(id: number) {
  console.log('id', id);
  return secureFetch(`clients?populate=*&filters[id][$eq]=${id}`);
}

export async function updateClientById(
  clientId: string,
  data: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
  }
) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.put(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/clients/${clientId}`,
    { data },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  return res.data;
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

export async function fetchFacturesUserById(userId: number, factureId: string) {
  return secureFetch(
    `factures?populate=*&filters[user][$eq]=${userId}&filters[documentId][$eq]=${factureId}`
  );
}

export async function createFacture(data: {
  reference: string;
  number: number;
  date: string;
  due_date: string;
  facture_status: string;
  currency: string;
  description: string;
  notes: string;
  pdf: string;
  client_id: number;
  project?: number;
  user: number;
  tva_applicable: boolean;
  invoice_lines: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/factures`,
    { data },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (res.status !== 200) {
    throw new Error('Erreur lors de la création de la facture');
  }
  return res.data;
}

export async function updateFactureById(
  factureId: string,
  data: {
    reference: string;
    number: number;
    date: string;
    due_date: string;
    facture_status: string;
    currency: string;
    description: string;
    notes: string;
    pdf?: string;
    client_id: number;
    project?: number;
    user: number;
    tva_applicable: boolean;
    invoice_lines: {
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
  }
) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.put(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/factures/${factureId}`,
    { data },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (res.status !== 200) {
    throw new Error('Erreur lors de la mise à jour de la facture');
  }
  return res.data;
}

export async function fetchMentorUsers(userId: number) {
  try {
    return secureFetch(`mentors?populate=*&filters[users][$eq]=${userId}`);
  } catch (error) {
    console.error('Error fetching mentors:', error);
    throw new Error('Erreur lors de la récupération des mentors');
  }
}

export async function fetchNumberOfMentorsUser(userId: number) {
  try {
    const res = await secureFetch(
      `mentors?populate=*&filters[users][$eq]=${userId}`
    );
    return res.data.length;
  } catch (error) {
    console.error('Error fetching number of mentors:', error);
    throw new Error('Erreur lors de la récupération du nombre de mentors');
  }
}

export async function fetchNumberOfNewslettersUser(userId: number) {
  try {
    const res = await secureFetch(
      `newsletters?populate=*&filters[author][$eq]=${userId}`
    );
    return res.data.length;
  } catch (error) {
    console.error('Error fetching number of newsletters:', error);
    throw new Error('Erreur lors de la récupération du nombre de newsletters');
  }
}

export async function fetchNewslettersUser(userId: number) {
  try {
    return secureFetch(`newsletters?populate=*&filters[author][$eq]=${userId}`);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    throw new Error('Erreur lors de la récupération des newsletters');
  }
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

export async function updateUser(
  userId: number,
  data: {
    username?: string;
    email?: string;
    profile_picture?: {
      url: string;
    };
    plan?: number;
    billing_type?: string;
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

//SUBSCRIPTIONS

export async function cancelSubscription(userId: number) {
  try {
    const existingSubscriptions = await fetchSubscriptionsUser(userId);
    if (existingSubscriptions.data && existingSubscriptions.data.length > 0) {
      // Mettre à jour la subscription existante
      const existingSubscription = existingSubscriptions.data[0];

      console.log(
        'Updating subscription with documentId:',
        existingSubscription.documentId
      );

      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/subscriptions/${existingSubscription.documentId}`,
        {
          data: {
            subscription_status: 'canceled',
          },
        }
      );
      return res.data;
    } else {
      throw new Error('Aucun abonnement trouvé');
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error("Erreur lors de l'annulation de l'abonnement");
  }
}

export async function fetchSubscriptionsUser(userId: number) {
  try {
    return secureFetch(
      `subscriptions?populate=*&filters[users][$eq]=${userId}`
    );
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw new Error('Erreur lors de la récupération des abonnements');
  }
}

export async function createSubscription(
  userId: number,
  data: {
    plan: string; // documentId du plan (string)
    billing_type: string;
    price?: number;
    trial?: boolean;
    plan_name?: string;
    plan_description?: string;
    plan_features?: string;
    start_date?: string;
  }
) {
  // Vérifier d'abord si l'utilisateur a déjà une subscription
  try {
    const existingSubscriptions = await fetchSubscriptionsUser(userId);

    if (existingSubscriptions.data && existingSubscriptions.data.length > 0) {
      // Mettre à jour la subscription existante
      const existingSubscription = existingSubscriptions.data[0];
      console.log(
        'Updating subscription with documentId:',
        existingSubscription.documentId
      );

      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/subscriptions/${existingSubscription.documentId}`,
        {
          data: {
            plan: data.plan,
            subscription_status: 'active',
            start_date: new Date().toISOString(),
            end_date: new Date(
              new Date().setDate(new Date().getDate() + 30)
            ).toISOString(),
            billing_type: data.billing_type,
            auto_renew: true,
            trial: data.trial || false,
          },
        }
      );
      return res.data;
    } else {
      // Créer une nouvelle subscription
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/subscriptions`,
        {
          data: {
            users: userId,
            plan: data.plan,
            subscription_status: 'active',
            start_date: new Date().toISOString(),
            end_date: new Date(
              new Date().setDate(new Date().getDate() + 30)
            ).toISOString(),
            billing_type: data.billing_type,
            auto_renew: true,
            trial: data.trial || false,
          },
        }
      );
      return res.data;
    }
  } catch (error) {
    console.error('Error in createSubscription:', error);
    throw error;
  }
}

export async function createProject(data: {
  title: string;
  description: string;
  project_status: string;
  start_date: string;
  end_date: string;
  notes?: string;
  type: string;
  technologies?: string[];
  client: number;
  document?: File;
  user?: number;
}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/projects`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    }
  );
  if (!res.ok) {
    throw new Error('Erreur lors de la création du projet');
  }
  return res.json();
}

// FACTURES

export const fetchFactureFromId = async (id: string) => {
  return secureFetch(`factures?populate=*&filters[id][$eq]=${id}`);
};

export const fetchFactureFromDocumentId = async (documentId: string) => {
  return secureFetch(
    `factures?populate=*&filters[documentId][$eq]=${documentId}`
  );
};

// COMPANY

export const fetchCompanyUser = async (userId: number) => {
  return secureFetch(`companies?populate=*&filters[user][$eq]=${userId}`);
};

export const updateCompanyUser = async (
  userId: number,
  companyId: string,
  data: {
    name: string;
    email: string;
    description: string;
    siret: string;
    siren: string;
    vat: string;
    phoneNumber: string;
    logo?: string;
    location: string;
    domaine: string;
    website: string;
  }
) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  //we need to find if the company exists
  const company = await fetchCompanyUser(userId);
  if (company.data.length === 0) {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/companies`,
      { data: { ...data } },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return res.data;
  } else {
    const res = await axios.put(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/companies/${companyId}`,
      { data: { ...data } },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return res.data;
  }
};
