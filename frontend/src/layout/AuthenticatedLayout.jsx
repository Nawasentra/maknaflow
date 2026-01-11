// src/layout/AuthenticatedLayout.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from '../components/layout/NavBar'
import DashboardPage from '../features/dashboard/DashboardPage'
import TransactionsPage from '../features/transactions/TransactionsPage'
import SettingsPage from '../features/settings/SettingsPage'
import AddBusinessPage from '../features/add-business/AddBusinessPage'

function AuthenticatedLayout({
  transactions,
  setTransactions,
  businessConfigs,
  setBusinessConfigs,
  appSettings,
  setAppSettings,
  lastUsedType,
  setLastUsedType,
  isLoading,
  error,
  notifications,
  unreadCount,
  onAllNotificationsRead,
  user,
  onLogout,
  theme,
  onToggleTheme,
  showToast,
  onReloadTransactions, // <- DITERIMA dari App.jsx
}) {
  return (
    <>
      <NavBar
        user={user}
        onLogout={onLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        onAllNotificationsRead={onAllNotificationsRead}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              transactions={transactions}
              isLoading={isLoading}
              error={error}
            />
          }
        />
        <Route
          path="/transactions"
          element={
            <TransactionsPage
              transactions={transactions}
              setTransactions={setTransactions}
              businessConfigs={businessConfigs}
              appSettings={appSettings}
              lastUsedType={lastUsedType}
              setLastUsedType={setLastUsedType}
              showToast={showToast}
              onRefresh={onReloadTransactions} // <- DIPASS ke TransactionsPage
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              businessConfigs={businessConfigs}
              setBusinessConfigs={setBusinessConfigs}
              appSettings={appSettings}
              setAppSettings={setAppSettings}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/add-business"
          element={
            <AddBusinessPage
              businessConfigs={businessConfigs}
              setBusinessConfigs={setBusinessConfigs}
              showToast={showToast}
            />
          }
        />
      </Routes>
    </>
  )
}

export default AuthenticatedLayout
