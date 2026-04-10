import { useState, useMemo, useCallback } from "react";
import { PAGINATION } from "../constants";

/**
 * Custom hook for pagination logic
 * @param {Array} items - All items to paginate
 * @param {number} initialPageSize - Initial items per page
 * @returns {object} Pagination state and methods
 */
export const usePagination = (items = [], initialPageSize = PAGINATION.DEFAULT_PAGE_SIZE) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / pageSize) || 1;
  }, [items.length, pageSize]);

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  // Go to specific page
  const goToPage = useCallback(
    (page) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  // Go to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  // Go to previous page
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  // Go to first page
  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Go to last page
  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Change page size (resets to first page)
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  // Reset to first page (useful when items change)
  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Check if has next/prev pages
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Get range info for display
  const rangeInfo = useMemo(() => {
    const start = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, items.length);
    return {
      start,
      end,
      total: items.length,
      text: `${start}-${end} de ${items.length}`,
    };
  }, [items.length, currentPage, pageSize]);

  // Get page numbers for pagination UI (with ellipsis logic)
  const getPageNumbers = useCallback(
    (maxVisible = 5) => {
      if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const pages = [];
      const half = Math.floor(maxVisible / 2);

      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }

      return pages;
    },
    [currentPage, totalPages]
  );

  return {
    // State
    currentPage,
    pageSize,
    totalPages,
    paginatedItems,

    // Navigation methods
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
    reset,

    // Helpers
    hasNextPage,
    hasPrevPage,
    rangeInfo,
    getPageNumbers,

    // Constants
    pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
  };
};

export default usePagination;
