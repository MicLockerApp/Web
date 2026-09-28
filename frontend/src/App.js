import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DateRangeProvider } from './context/DateRangeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WelcomeBanner from './components/WelcomeBanner';
import ReviewGatingWrapper from './components/ReviewGatingWrapper';
import analytics from './services/analytics';
import AppOnlyNotice from './components/site/AppOnlyNotice';
import SharedVideoPage from './pages/SharedVideoPage';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyResetCodePage from './pages/VerifyResetCodePage';
import SearchPage from './pages/SearchPage';
import ListingDetailPage from './pages/ListingDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import DashboardPage from './pages/DashboardPage';
import CreateListingPage from './pages/CreateListingPage';
import EditListingPage from './pages/EditListingPage';
import MessagesPage from './pages/MessagesPage';
import ReturnPolicyPage from './pages/ReturnPolicyPage';
import CareersPage from './pages/CareersPage';
import JobSearchPage from './pages/JobSearchPage';
import AboutPage from './pages/AboutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ContactSupportPage from './pages/ContactSupportPage';
import HelpCenterPage from './pages/HelpCenterPage';
import LegalPage from './pages/LegalPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import BillingPolicyPage from './pages/BillingPolicyPage';
import PurchaseProtectionPage from './pages/PurchaseProtectionPage';
import CommunityRulesBuyersPage from './pages/CommunityRulesBuyersPage';
import CommunityRulesSellersPage from './pages/CommunityRulesSellersPage';
import PayoutsAndCreditsPage from './pages/PayoutsAndCreditsPage';
import IntellectualPropertyPage from './pages/IntellectualPropertyPage';
import SearchAndAdRankingPage from './pages/SearchAndAdRankingPage';
import EUDataPolicyPage from './pages/EUDataPolicyPage';
import LearnPage from './pages/LearnPage';
import MapPage from './pages/MapPage';

// Analytics are a no-op until the app backend has an events endpoint.
analytics.init();

// /listings/{id} is the app's share-link path; show the website listing page.
const ListingShareRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/listing/${id}`} replace />;
};

// Signed-in accounts must finish setup (Terms + role/username) first — same
// rule as the apps. Everything else stays reachable only after that.
const SETUP_ALLOWED = ['/register', '/login', '/legal', '/about', '/help', '/contact-support'];
const SetupGate = ({ children }) => {
  const { needsTerms, needsProfileSetup, loading } = useAuth();
  const location = useLocation();
  if (loading) return children;
  const allowed = SETUP_ALLOWED.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));
  if ((needsTerms || needsProfileSetup) && !allowed) return <Navigate to="/register" replace />;
  return children;
};

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
          <ReviewGatingWrapper>
            <Layout>
              <SetupGate>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/forgot-password/verify" element={<VerifyResetCodePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route path="/cart" element={<AppOnlyNotice feature="The cart" />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancel" element={<Navigate to="/" replace />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/profile/:id/edit" element={<Navigate to="/profile/edit" replace />} />
              <Route path="/settings" element={<EditProfilePage />} />
              <Route path="/account" element={<EditProfilePage />} />
              <Route path="/account/settings" element={<EditProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/gigs" element={<AppOnlyNotice feature="The gig board" />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/venue/:venueId/calendar" element={<AppOnlyNotice feature="Venue calendars" />} />
              <Route path="/venue/bookings" element={<AppOnlyNotice feature="Bookings" />} />
              <Route path="/my-bookings" element={<AppOnlyNotice feature="Bookings" />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/listings/:id/edit" element={<EditListingPage />} />
              <Route path="/sell" element={<CreateListingPage />} />
              <Route path="/offers" element={<AppOnlyNotice feature="Offers" />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/trades" element={<AppOnlyNotice feature="Trades" />} />
              <Route path="/trades/:tradeId" element={<AppOnlyNotice feature="Trades" />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/admin" element={<AppOnlyNotice feature="The admin panel" />} />
              <Route path="/admin/analytics" element={<AppOnlyNotice feature="The admin panel" />} />
              <Route path="/returns" element={<ReturnPolicyPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/careers/jobs" element={<JobSearchPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact-support" element={<ContactSupportPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/admin/tickets" element={<AppOnlyNotice feature="The admin panel" />} />
              <Route path="/admin/tickets/:id" element={<AppOnlyNotice feature="The admin panel" />} />
              <Route path="/admin/reports" element={<AppOnlyNotice feature="The admin panel" />} />
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
              <Route path="/employee-setup" element={<Navigate to="/" replace />} />
              <Route path="/listings/:id" element={<ListingShareRedirect />} />
              <Route path="/videos/:id" element={<SharedVideoPage />} />
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
              </SetupGate>
          </Layout>
          </ReviewGatingWrapper>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DateRangeProvider>
        <AppContent />
      </DateRangeProvider>
    </ThemeProvider>
  );
}

export default App;
