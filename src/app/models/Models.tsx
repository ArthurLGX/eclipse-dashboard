/**
 * @file Models.tsx
 * @description Réexport des types depuis le fichier centralisé
 * @deprecated Utilisez directement `import { ... } from '@/types'` à la place
 */

// Réexport de tous les types depuis le fichier centralisé
export type {
  // Entités principales
  Facture,
  Client,
  Prospect,
  Project,
  User,
  PdfFile,
  Company,
  InvoiceLine,
  Mentor,
  Newsletter,
  Plan,
  Subscription,
  Role,
  Technology,
  ImageFile,
  
  // Réponses API
  FacturesResponse,
  ApiResponse,
  PaginationMeta,
  
  // Types pour les formulaires
  CreateFactureData,
  UpdateFactureData,
  CreateClientData,
  UpdateClientData,
  CreateProjectData,
  UpdateProjectData,
  CreateProspectData,
  
  // Enums / Types littéraux
  FactureStatus,
  ProjectStatus,
  ProjectType,
  Currency,
  ProcessStatus,
  ProspectStatus,
  SubscriptionStatus,
  BillingType,
  
  // Types pour les listes
  ClientListItem,
  ProjectListItem,
  FactureListItem,
  
  // Dashboard
  DashboardStats,
  
  // Utilitaires
  PartialBy,
  RequiredBy,
  KeysOfType,
} from '@/types';
