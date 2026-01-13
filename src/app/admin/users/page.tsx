'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconUsers,
  IconSearch,
  IconBan,
  IconCheck,
  IconTrash,
  IconMail,
  IconCrown,
  IconDownload,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconEye,
  IconShield,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';

interface Role {
  id: number;
  name: string;
  type: string;
}

interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  role?: Role;
  subscription?: {
    id: number;
    plan?: {
      name: string;
    };
  };
}

interface UserModalData {
  user: User | null;
  action: 'view' | 'edit' | 'block' | 'delete' | 'role' | null;
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [modalData, setModalData] = useState<UserModalData>({ user: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const pageSize = 20;

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users-permissions/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      let url = `${API_URL}/api/users?populate=*&pagination[page]=${currentPage}&pagination[pageSize]=${pageSize}`;
      
      if (searchTerm) {
        url += `&filters[$or][0][username][$containsi]=${searchTerm}&filters[$or][1][email][$containsi]=${searchTerm}`;
      }
      if (filterStatus === 'blocked') {
        url += `&filters[blocked][$eq]=true`;
      } else if (filterStatus === 'active') {
        url += `&filters[blocked][$eq]=false`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
        setTotalUsers(data.meta?.pagination?.total || data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterStatus]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role?.name === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  const totalPages = Math.ceil(totalUsers / pageSize);

  const handleChangeRole = async (user: User, newRoleId: number) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRoleId }),
      });

      if (response.ok) {
        const newRole = roles.find(r => r.id === newRoleId);
        setUsers(users.map(u => 
          u.id === user.id ? { ...u, role: newRole } : u
        ));
        setModalData({ user: null, action: null });
        showGlobalPopup(t('role_updated_success') || 'Rôle mis à jour avec succès', 'success');
      } else {
        showGlobalPopup(t('role_update_error') || 'Erreur lors de la mise à jour du rôle', 'error');
      }
    } catch (error) {
      console.error('Error changing role:', error);
      showGlobalPopup(t('role_update_error') || 'Erreur lors de la mise à jour du rôle', 'error');
    } finally {
      setActionLoading(false);
      setSelectedRole(null);
    }
  };

  const handleBlockUser = async (user: User) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocked: !user.blocked }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === user.id ? { ...u, blocked: !u.blocked } : u
        ));
        setModalData({ user: null, action: null });
        showGlobalPopup(
          user.blocked 
            ? t('user_unblocked') || 'Utilisateur débloqué' 
            : t('user_blocked') || 'Utilisateur bloqué',
          'success'
        );
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== user.id));
        setModalData({ user: null, action: null });
        showGlobalPopup(t('user_deleted') || 'Utilisateur supprimé', 'success');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['ID', 'Username', 'Email', 'Role', 'Status', 'Created At'].join(','),
      ...filteredUsers.map(user => [
        user.id,
        user.username,
        user.email,
        user.role?.name || 'N/A',
        user.blocked ? 'Blocked' : 'Active',
        new Date(user.createdAt).toLocaleDateString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedRole(user.role?.id || null);
    setModalData({ user, action: 'role' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <IconUsers className="w-7 h-7 text-accent" />
            {t('users_management') || 'Gestion des utilisateurs'}
          </h1>
          <p className="text-sm text-muted">{totalUsers} {t('users_total') || 'utilisateurs au total'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportUsers}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-hover ease-in-out duration-300"
          >
            <IconDownload className="w-4 h-4" />
            {t('export') || 'Exporter'}
          </button>
          <button
            onClick={() => fetchUsers()}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-hover ease-in-out duration-300"
          >
            <IconRefresh className="w-4 h-4" />
            {t('refresh') || 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder={t('search_by_name_or_email') || 'Rechercher par nom ou email'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full !pl-10"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input w-full md:w-48"
          >
            <option value="all">{t('all_statuses') || 'Tous les statuts'}</option>
            <option value="active">{t('active') || 'Actifs'}</option>
            <option value="blocked">{t('blocked') || 'Bloqués'}</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">{t('all_roles') || 'Tous les rôles'}</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-light border border-accent-light rounded-xl p-4 flex items-center justify-between"
        >
          <span className="text-sm text-accent font-medium">
            {selectedUsers.length} {t('users_selected') || 'utilisateur(s) sélectionné(s)'}
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-warning-light text-warning rounded-lg hover:bg-warning-light">
              {t('block') || 'Bloquer'}
            </button>
            <button className="px-3 py-1.5 text-sm bg-danger-light text-danger rounded-lg hover:bg-danger-light">
              {t('delete') || 'Supprimer'}
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1.5 text-sm bg-card text-muted rounded-lg hover:bg-hover transition-colors ease-in-out duration-300"
            >
              {t('cancel') || 'Annuler'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-muted"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('user') || 'Utilisateur'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('email') || 'Email'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('role') || 'Rôle'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('status') || 'Statut'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('registration') || 'Inscription'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  {t('actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className={`hover:bg-hover transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-accent/5' : ''
                  } ${index !== filteredUsers.length - 1 ? 'border-b border-muted' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-muted"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center">
                        <span className="text-accent font-medium text-sm">
                          {user.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-primary text-sm">{user.username}</p>
                        <p className="text-xs text-muted">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <IconMail className="w-4 h-4 text-muted" />
                      <span className="text-sm text-secondary">{user.email}</span>
                      {user.confirmed && (
                        <IconCheck className="w-4 h-4 text-success" title={t('email_confirmed') || 'Email confirmé'} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => openRoleModal(user)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                        user.role?.name === 'Admin' 
                          ? 'bg-accent-light text-accent' 
                          : 'bg-info-light text-info'
                      }`}
                      title={t('click_to_change_role') || 'Cliquer pour changer le rôle'}
                    >
                      {user.role?.name === 'Admin' && <IconCrown className="w-3 h-3" />}
                      {user.role?.name || 'N/A'}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.blocked 
                        ? 'bg-danger-light text-danger' 
                        : 'bg-success-light text-success'
                    }`}>
                      {user.blocked ? (
                        <>
                          <IconBan className="w-3 h-3" />
                          {t('blocked') || 'Bloqué'}
                        </>
                      ) : (
                        <>
                          <IconCheck className="w-3 h-3" />
                          {t('active') || 'Actif'}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalData({ user, action: 'view' })}
                        className="p-2 rounded-lg hover:bg-hover transition-colors"
                        title={t('view_details') || 'Voir détails'}
                      >
                        <IconEye className="w-4 h-4 text-muted" />
                      </button>
                      <button
                        onClick={() => openRoleModal(user)}
                        className="p-2 rounded-lg hover:bg-hover transition-colors"
                        title={t('change_role') || 'Changer le rôle'}
                      >
                        <IconShield className="w-4 h-4 text-muted" />
                      </button>
                      <button
                        onClick={() => setModalData({ user, action: 'block' })}
                        className="p-2 rounded-lg hover:bg-hover transition-colors"
                        title={user.blocked ? t('unblock') || 'Débloquer' : t('block') || 'Bloquer'}
                      >
                        <IconBan className={`w-4 h-4 ${user.blocked ? 'text-warning' : 'text-muted'}`} />
                      </button>
                      <button
                        onClick={() => setModalData({ user, action: 'delete' })}
                        className="p-2 rounded-lg hover:bg-danger-light transition-colors"
                        title={t('delete') || 'Supprimer'}
                      >
                        <IconTrash className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <IconUsers className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">{t('no_users_found') || 'Aucun utilisateur trouvé'}</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-muted">
            <p className="text-sm text-muted">
              {t('page') || 'Page'} {currentPage} {t('of') || 'sur'} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalData.user && modalData.action && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setModalData({ user: null, action: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-md w-full"
            >
              {/* View Modal */}
              {modalData.action === 'view' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-primary">{t('user_details') || 'Détails utilisateur'}</h3>
                    <button
                      onClick={() => setModalData({ user: null, action: null })}
                      className="p-2 rounded-lg hover:bg-hover"
                    >
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
                        <span className="text-2xl text-accent font-bold">
                          {modalData.user.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-primary">{modalData.user.username}</p>
                        <p className="text-sm text-muted">{modalData.user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted">
                      <div>
                        <p className="text-xs text-muted">ID</p>
                        <p className="text-sm font-medium text-primary">{modalData.user.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{t('role') || 'Rôle'}</p>
                        <p className="text-sm font-medium text-primary">{modalData.user.role?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{t('status') || 'Statut'}</p>
                        <p className={`text-sm font-medium ${modalData.user.blocked ? 'text-danger' : 'text-success'}`}>
                          {modalData.user.blocked ? t('blocked') || 'Bloqué' : t('active') || 'Actif'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{t('email_confirmed') || 'Email confirmé'}</p>
                        <p className={`text-sm font-medium ${modalData.user.confirmed ? 'text-success' : 'text-warning'}`}>
                          {modalData.user.confirmed ? t('yes') || 'Oui' : t('no') || 'Non'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{t('registration') || 'Inscription'}</p>
                        <p className="text-sm font-medium text-primary">
                          {new Date(modalData.user.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{t('last_update') || 'Dernière mise à jour'}</p>
                        <p className="text-sm font-medium text-primary">
                          {new Date(modalData.user.updatedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Role Modal */}
              {modalData.action === 'role' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-primary">{t('change_role') || 'Changer le rôle'}</h3>
                    <button
                      onClick={() => setModalData({ user: null, action: null })}
                      className="p-2 rounded-lg hover:bg-hover"
                    >
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
                        <span className="text-lg text-accent font-bold">
                          {modalData.user.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{modalData.user.username}</p>
                        <p className="text-sm text-muted">{modalData.user.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        {t('select_new_role') || 'Sélectionner le nouveau rôle'}
                      </label>
                      <div className="space-y-2">
                        {roles.map(role => (
                          <button
                            key={role.id}
                            onClick={() => setSelectedRole(role.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              selectedRole === role.id
                                ? 'border-accent bg-accent-light'
                                : 'border-muted hover:border-accent/50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${
                              role.name === 'Admin' ? 'bg-accent-light' : 'bg-info-light'
                            }`}>
                              {role.name === 'Admin' ? (
                                <IconCrown className="w-4 h-4 text-accent" />
                              ) : (
                                <IconShield className="w-4 h-4 text-info" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-primary">{role.name}</p>
                              <p className="text-xs text-muted">{role.type}</p>
                            </div>
                            {selectedRole === role.id && (
                              <IconCheck className="w-5 h-5 text-accent ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setModalData({ user: null, action: null })}
                        className="flex-1 px-4 py-2 border border-muted rounded-lg hover:bg-hover"
                      >
                        {t('cancel') || 'Annuler'}
                      </button>
                      <button
                        onClick={() => selectedRole && handleChangeRole(modalData.user!, selectedRole)}
                        disabled={actionLoading || !selectedRole || selectedRole === modalData.user.role?.id}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50"
                      >
                        {actionLoading ? t('loading') || 'Chargement...' : t('validate') || 'Valider'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Block Modal */}
              {modalData.action === 'block' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-4">
                      <IconBan className="w-8 h-8 text-warning" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">
                      {modalData.user.blocked 
                        ? t('unblock_user') || 'Débloquer cet utilisateur' 
                        : t('block_user') || 'Bloquer cet utilisateur'}
                    </h3>
                    <p className="text-sm text-muted mt-2">
                      {modalData.user.blocked
                        ? `${modalData.user.username} ${t('will_be_able_to_login') || 'pourra de nouveau se connecter.'}`
                        : `${modalData.user.username} ${t('will_not_be_able_to_login') || 'ne pourra plus se connecter.'}`
                      }
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalData({ user: null, action: null })}
                      className="flex-1 px-4 py-2 border border-muted rounded-lg hover:bg-hover"
                    >
                      {t('cancel') || 'Annuler'}
                    </button>
                    <button
                      onClick={() => handleBlockUser(modalData.user!)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-warning text-white rounded-lg hover:bg-[var(--color-warning)] disabled:opacity-50"
                    >
                      {actionLoading 
                        ? t('loading') || 'Chargement...' 
                        : modalData.user.blocked 
                          ? t('unblock') || 'Débloquer' 
                          : t('block') || 'Bloquer'}
                    </button>
                  </div>
                </>
              )}

              {/* Delete Modal */}
              {modalData.action === 'delete' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
                      <IconTrash className="w-8 h-8 text-danger" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary">
                      {t('delete_user') || 'Supprimer cet utilisateur'} ?
                    </h3>
                    <p className="text-sm text-muted mt-2">
                      {t('delete_user_warning') || 'Cette action est irréversible. Toutes les données de'} {modalData.user.username} {t('will_be_deleted') || 'seront supprimées.'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalData({ user: null, action: null })}
                      className="flex-1 px-4 py-2 border border-muted rounded-lg hover:bg-hover"
                    >
                      {t('cancel') || 'Annuler'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(modalData.user!)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-[var(--color-danger)] disabled:opacity-50"
                    >
                      {actionLoading ? t('deleting') || 'Suppression...' : t('delete') || 'Supprimer'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
