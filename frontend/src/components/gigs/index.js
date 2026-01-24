/**
 * Gig Board Components - Barrel Export
 * 
 * Central export point for all gig-related components.
 * Import from this file for cleaner imports in consuming code.
 * 
 * Usage:
 *   import { GigCard, CreateGigModal, ViewGigModal, CATEGORY_ICONS } from '../components/gigs';
 */

export { default as GigCard } from './GigCard';
export { default as CreateGigModal } from './CreateGigModal';
export { default as ViewGigModal } from './ViewGigModal';
export { CATEGORY_ICONS, CATEGORY_LABELS, PLACEHOLDER_IMAGES } from './constants';
