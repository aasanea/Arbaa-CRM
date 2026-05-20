import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../context/I18nContext';
import {
  Users,
  Shield,
  Mail,
  Award,
  X,
  Lock,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Check,
} from 'lucide-react';

export const Team: React.FC = () => {
  const { t, locale, isRtl } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, addToast, user: currentUser } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState(''); // Stores roleId

  // Query: Users list
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Query: Roles list
  const { data: roles } = useQuery({
    queryKey: ['systemRoles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  // Query: All Permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['systemPermissions'],
    queryFn: async () => {
      const res = await api.get('/roles/permissions');
      return res.data;
    },
  });

  // Mutation: Change user's role
  const roleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await api.patch(`/users/${userId}/role`, { roleId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
      addToast(locale === 'ar' ? 'تم تعديل دور المستخدم وتحديث الصلاحيات بنجاح.' : 'User role and permissions updated successfully.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل تحديث دور المستخدم.' : 'Failed to update user role.'), 'error');
    },
  });

  // Mutation: Change user's status (Activate/Suspend)
  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await api.patch(`/users/${userId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
      addToast(locale === 'ar' ? 'تم تحديث حالة الموظف بنجاح.' : 'User status updated successfully.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل تغيير حالة الموظف.' : 'Failed to change user status.'), 'error');
    },
  });

  // Mutation: Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
      addToast(locale === 'ar' ? 'تم حذف حساب الموظف وجميع سجلاته وطلباته بنجاح من النظام.' : 'User account and all records deleted successfully.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل حذف الموظف من النظام.' : 'Failed to delete user.'), 'error');
    },
  });

  // Mutation: Add user
  const addMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await api.post('/users', userData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
      addToast(locale === 'ar' ? 'تمت إضافة عضو الفريق الجديد بنجاح.' : 'New team member added successfully.', 'success');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل إضافة عضو جديد.' : 'Failed to add team member.'), 'error');
    },
  });

  // Mutation: Update role permissions matrix
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const res = await api.put(`/roles/${roleId}/permissions`, { permissionIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemRoles'] });
      addToast(locale === 'ar' ? 'تمت مزامنة صلاحيات الدور وتطبيقها ديناميكياً فوراً.' : 'Role permissions synchronized and applied dynamically.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل تعديل الصلاحيات.' : 'Failed to modify permissions.'), 'error');
    },
  });

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    if (roles && roles.length > 0) {
      setNewRole(roles[0].id);
    } else {
      setNewRole('');
    }
  };

  const handleRoleChange = (userId: string, roleId: string) => {
    roleMutation.mutate({ userId, roleId });
  };

  const handleStatusToggle = (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ userId, status: nextStatus });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(locale === 'ar' ? `⚠️ تحذير أمني: هل أنت متأكد من حذف الحساب "${userName}" نهائياً؟ سيقوم النظام بحذف صفقاته وطلباته المعلقة بالتبعية لمطابقة قيود قاعدة البيانات.` : `⚠️ Security Warning: Are you sure you want to permanently delete the account "${userName}"? The system will cascade delete their deals and pending requests.`)) {
      deleteMutation.mutate(userId);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword || !newRole) {
      addToast(locale === 'ar' ? 'يرجى ملء كافة الحقول المطلوبة.' : 'Please fill in all required fields.', 'warning');
      return;
    }
    addMutation.mutate({
      name: newName,
      email: newEmail,
      password: newPassword,
      roleId: newRole,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    if (roles && roles.length > 0 && !newRole) {
      setNewRole(roles[0].id);
    }
    setShowAddModal(true);
  };

  const handlePermissionToggle = (role: any, permissionId: string) => {
    let activeIds: string[] = role.rolePermissions.map((rp: any) => rp.permissionId);
    
    if (activeIds.includes(permissionId)) {
      activeIds = activeIds.filter((id) => id !== permissionId);
    } else {
      activeIds.push(permissionId);
    }

    updatePermissionsMutation.mutate({
      roleId: role.id,
      permissionIds: activeIds,
    });
  };

  const getPermissionLabel = (name: string) => {
    return t(name) || name;
  };

  return (
    <div className="p-6 space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-luxury-gold-500" /> {locale === 'ar' ? 'إدارة فريق العمل والصلاحيات' : 'Team & Permissions Management'}
          </h1>
          <p className="text-xs text-luxury-dark-400 mt-1">
            {locale === 'ar' ? 'إدارة حسابات المسوقين والمدراء وتعيين الأدوار الأمنية في النظام (RBAC).' : 'Manage team accounts, marketers, admins, and assign security roles (RBAC).'}
          </p>
        </div>
        {hasPermission('manage_users') && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-gold-gradient hover:opacity-95 text-luxury-dark-950 px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-luxury-gold-500/5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> {locale === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
          </button>
        )}
      </div>

      {/* Team grid card */}
      {teamLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl skeleton-shimmer border border-luxury-dark-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team?.map((member: any) => {
            const isSelf = member.id === currentUser?.id;
            return (
              <div
                key={member.id}
                className={`glass-card rounded-2xl p-5 border flex flex-col justify-between glass-card-hover relative ${
                  member.status === 'INACTIVE' ? 'border-rose-500/20 opacity-75' : 'border-luxury-dark-800'
                }`}
              >
                {/* Profile details */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-luxury-dark-50">{member.name}</h3>
                        {isSelf && (
                          <span className="bg-luxury-gold-500/20 text-luxury-gold-400 border border-luxury-gold-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded font-sans">
                            {locale === 'ar' ? 'أنت' : 'You'}
                          </span>
                        )}
                        {member.status === 'INACTIVE' && (
                          <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-bold px-1.5 py-0.2 rounded font-sans">
                            {locale === 'ar' ? 'معطل' : 'Suspended'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-luxury-dark-400 font-mono flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-luxury-gold-500/60" /> {member.email}
                      </span>
                    </div>

                    {/* Role dropdown for admins, badge for others */}
                    {hasPermission('manage_users') && !isSelf ? (
                      <select
                        value={member.roleId || ''}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={roleMutation.isPending}
                        className="text-[10px] font-bold bg-luxury-dark-900 border border-luxury-dark-800 text-luxury-gold-500 rounded py-1 px-1.5 focus:ring-0 focus:outline-none"
                      >
                        {roles?.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {t(r.name) || r.description || r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-luxury-gold-500/10 border border-luxury-gold-500/20 text-luxury-gold-500 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        <Shield className="w-3 h-3" /> {t(member.role?.name) || member.role?.description || member.role?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="border-t border-luxury-dark-800/80 pt-4 mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-luxury-dark-400">
                    <Award className="w-4 h-4 text-luxury-gold-500" /> {locale === 'ar' ? 'صفقات البيع:' : 'Sales Deals:'}
                    <span className={`font-bold text-luxury-dark-100 font-mono bg-luxury-dark-900 px-2 py-0.5 rounded border border-luxury-dark-800/80 ${locale === 'ar' ? 'mr-1' : 'ml-1'}`}>
                      {member.dealCount}
                    </span>
                  </div>

                  {/* Actions for Super Admins */}
                  {hasPermission('manage_users') && !isSelf && (
                    <div className="flex items-center gap-1">
                      {/* Suspend / Activate toggle button */}
                      <button
                        onClick={() => handleStatusToggle(member.id, member.status)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          member.status === 'ACTIVE'
                            ? 'border-luxury-dark-800 text-emerald-400 hover:border-emerald-500/20'
                            : 'border-rose-500/30 text-rose-500 hover:bg-rose-500/5'
                        }`}
                        title={member.status === 'ACTIVE' ? 'تعليق الحساب' : 'تنشيط الحساب'}
                      >
                        {member.status === 'ACTIVE' ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete account */}
                      <button
                        onClick={() => handleDeleteUser(member.id, member.name)}
                        className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-rose-500 hover:border-rose-500/20 transition-all"
                        title="حذف الحساب نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions Matrix Dynamic Section (Super Admin Control Panel) */}
      {currentUser?.roleName === 'SUPER_ADMIN' && roles && allPermissions && (
        <div className="glass-card rounded-2xl border border-luxury-dark-800 overflow-hidden slide-up">
          <div className="p-5 border-b border-luxury-dark-800 bg-luxury-dark-900/20 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-luxury-dark-50 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-luxury-gold-500" /> {locale === 'ar' ? 'لوحة إدارة الصلاحيات التفاعلية (Permissions Matrix)' : 'Interactive Permissions Matrix'}
              </h2>
              <p className="text-[10px] text-luxury-dark-400 mt-0.5">
                {locale === 'ar' ? 'تعديل الصلاحيات الممنوحة للأدوار ديناميكياً لتسري وتتطبق على المستخدمين فوراً دون إعادة تشغيل الخادم.' : 'Modify role permissions dynamically to apply to users instantly without restarting the server.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full ${locale === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
              <thead>
                <tr className="border-b border-luxury-dark-800 bg-luxury-dark-900/40 text-luxury-dark-300 text-xs font-semibold">
                  <th className="p-4 w-48">{locale === 'ar' ? 'الدور الوظيفي / الدور الأمني' : 'Security Role / Level'}</th>
                  {allPermissions.map((perm: any) => (
                    <th key={perm.id} className="p-4 text-center text-[10px] font-medium leading-tight">
                      {getPermissionLabel(perm.name)}
                      <span className="block text-[8px] text-luxury-dark-400 font-mono mt-0.5 font-normal">
                        ({perm.name})
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-dark-800/40 text-xs">
                {roles.map((role: any) => {
                  const isSuperAdminRole = role.name === 'SUPER_ADMIN';
                  return (
                    <tr
                      key={role.id}
                      className={`hover:bg-luxury-dark-900/20 transition-colors ${
                        isSuperAdminRole ? 'bg-luxury-gold-500/2' : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-luxury-dark-100">
                        <div className="flex flex-col">
                          <span>{t(role.name) || role.description || role.name}</span>
                          <span className="text-[9px] text-luxury-dark-400 font-mono">{role.name}</span>
                        </div>
                      </td>
                      {allPermissions.map((perm: any) => {
                        const hasPerm = role.rolePermissions?.some(
                          (rp: any) => rp.permissionId === perm.id
                        );
                        return (
                          <td key={perm.id} className="p-4 text-center">
                            {isSuperAdminRole ? (
                              <div className="flex items-center justify-center text-luxury-gold-500">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : (
                              <label className="inline-flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasPerm}
                                  onChange={() => handlePermissionToggle(role, perm.id)}
                                  disabled={updatePermissionsMutation.isPending}
                                  className="w-4.5 h-4.5 bg-luxury-dark-900 border-luxury-dark-700 rounded text-luxury-gold-500 focus:ring-0 focus:ring-offset-0 focus:outline-none transition-colors"
                                />
                              </label>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative slide-up" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setShowAddModal(false)}
              className={`absolute ${locale === 'ar' ? 'left-6' : 'right-6'} top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">{locale === 'ar' ? 'إضافة عضو جديد لفريق العمل' : 'Add New Team Member'}</h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={isRtl ? 'text-right' : 'text-left'}>{locale === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'ar' ? 'أدخل اسم الموظف ثلاثياً' : 'Enter employee full name'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={isRtl ? 'text-right' : 'text-left'}>{locale === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={isRtl ? 'text-right' : 'text-left'}>{locale === 'ar' ? 'كلمة المرور المؤقتة *' : 'Temporary Password *'}</label>
                <div className="relative">
                  <Lock className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3.5 w-4 h-4 text-luxury-dark-400`} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full ${isRtl ? 'pr-10' : 'pl-10'} font-mono`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={isRtl ? 'text-right' : 'text-left'}>{locale === 'ar' ? 'الدور والصلاحيات *' : 'Role & Permissions *'}</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  {roles?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {t(r.name) || r.description || r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="bg-gold-gradient text-luxury-dark-950 font-bold px-6 py-2.5 rounded-lg text-xs cursor-pointer"
                >
                  {addMutation.isPending ? t('loading') : (locale === 'ar' ? 'تأكيد وإضافة الحساب' : 'Confirm & Add Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
