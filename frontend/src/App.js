import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import WelcomeBanner from './components/WelcomeBanner';
import analytics from './services/analytics';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyResetCodePage from './pages/VerifyResetCodePage';
import SearchPage from './pages/SearchPage';
import ListingDetailPage from './pages/ListingDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import FavoritesPage from './pages/FavoritesPage';
import DashboardPage from './pages/DashboardPage';
import CreateListingPage from './pages/CreateListingPage';
import EditListingPage from './pages/EditListingPage';
import MessagesPage from './pages/MessagesPage';
import AdminPage from './pages/AdminPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReturnPolicyPage from './pages/ReturnPolicyPage';
import CareersPage from './pages/CareersPage';
import JobSearchPage from './pages/JobSearchPage';
import AboutPage from './pages/AboutPage';
import OffersPage from './pages/OffersPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ContactSupportPage from './pages/ContactSupportPage';
import HelpCenterPage from './pages/HelpCenterPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import LegalPage from './pages/LegalPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import BillingPolicyPage from './pages/BillingPolicyPage';
import PurchaseProtectionPage from './pages/PurchaseProtectionPage';
import EmployeeSetupPage from './pages/EmployeeSetupPage';
import CommunityRulesBuyersPage from './pages/CommunityRulesBuyersPage';
import CommunityRulesSellersPage from './pages/CommunityRulesSellersPage';
import TradesPage from './pages/TradesPage';
import TradeDetailPage from './pages/TradeDetailPage';
import PayoutsAndCreditsPage from './pages/PayoutsAndCreditsPage';
import IntellectualPropertyPage from './pages/IntellectualPropertyPage';
import SearchAndAdRankingPage from './pages/SearchAndAdRankingPage';
import EUDataPolicyPage from './pages/EUDataPolicyPage';

// Initialize analytics on app load
analytics.init();

// Layout component that conditionally shows navbar/footer
const Layout = ({ children }) => {
  const location = useLocation();
  const { isDark } = useTheme();
  const isJobsPage = location.pathname === '/careers/jobs';

  // Track page views
  useEffect(() => {
    analytics.pageView(location.pathname, { search: location.search });
  }, [location.pathname, location.search]);

  if (isJobsPage) {
    // Jobs page has its own layout
    return <>{children}</>;
  }

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <Navbar />
      <WelcomeBanner />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

function AppContent() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/forgot-password/verify" element={<VerifyResetCodePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/profile/:id/edit" element={<EditProfilePage />} />
              <Route path="/settings" element={<EditProfilePage />} />
              <Route path="/account" element={<AccountSettingsPage />} />
              <Route path="/account/settings" element={<AccountSettingsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/listings/:id/edit" element={<EditListingPage />} />
              <Route path="/sell" element={<CreateListingPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/trades" element={<TradesPage />} />
              <Route path="/trades/:tradeId" element={<TradeDetailPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
              <Route path="/returns" element={<ReturnPolicyPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/careers/jobs" element={<JobSearchPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact-support" element={<ContactSupportPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/tickets/:id" element={<AdminTicketsPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/legal/terms-of-use" element={<TermsOfUsePage />} />
              <Route path="/legal/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/legal/billing-policy" element={<BillingPolicyPage />} />
              <Route path="/legal/purchase-protection" element={<PurchaseProtectionPage />} />
              <Route path="/legal/buyers" element={<CommunityRulesBuyersPage />} />
              <Route path="/legal/sellers" element={<CommunityRulesSellersPage />} />
              <Route path="/legal/payouts" element={<PayoutsAndCreditsPage />} />
              <Route path="/legal/intellectual-property" element={<IntellectualPropertyPage />} />
              <Route path="/legal/search-ranking" element={<SearchAndAdRankingPage />} />
              <Route path="/legal/eu-policy" element={<EUDataPolicyPage />} />
              <Route path="/employee-setup" element={<EmployeeSetupPage />} />
              {/* Fallback */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-theme-primary mb-4">404</h1>
                    <p className="text-theme-secondary">Page not found</p>
                  </div>
                </div>
              } />
            </Routes>
          </Layout>
          {/* AI Chat Widget - Stateless UI, can be replaced with Crisp */}
          <ChatWidget />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
