// This utility provides a standardized function for formatting date strings.
export const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Adjust for timezone offset to prevent displaying the previous day.
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error("Could not format date:", dateString, error);
        return dateString; // Fallback to the original string on error
    }
};

/**
 * Safely formats a Firestore Timestamp object, a JavaScript Date object, or a date string
 * into a readable date string.
 * @param timestamp - The Firestore Timestamp, Date object, or date string.
 * @returns A formatted date string (e.g., "DD-MM-YYYY") or "N/A" if the input is invalid.
 */
export const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) {
        return 'N/A';
    }

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof timestamp.toDate === 'function') {
        try {
            date = timestamp.toDate();
        } catch (error) {
            console.error("Could not convert Firestore timestamp to Date:", timestamp, error);
            return 'Invalid Date';
        }
    }
    // Handle Date objects (from optimistic UI updates)
    else if (timestamp instanceof Date) {
        date = timestamp;
    }
    // Handle date strings
    else if (typeof timestamp === 'string' && new Date(timestamp).toString() !== 'Invalid Date') {
        date = new Date(timestamp);
    }
    else {
        // Fallback for any other invalid type
        return 'N/A';
    }

    try {
        // Return a more complete string with date and time
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error("Could not format timestamp:", date, error);
        return 'Invalid Date';
    }
};

/**
 * Safely formats a Firestore Timestamp object, a JavaScript Date object, or a date string
 * into a readable time string.
 * @param timestamp - The Firestore Timestamp, Date object, or date string.
 * @returns A formatted time string (e.g., "10:30 AM") or "N/A" if the input is invalid.
 */
export const formatTime = (timestamp: any): string => {
    if (!timestamp) {
        return 'N/A';
    }

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof timestamp.toDate === 'function') {
        try {
            date = timestamp.toDate();
        } catch (error) {
            console.error("Could not convert Firestore timestamp to Date:", timestamp, error);
            return 'Invalid Time';
        }
    }
    // Handle Date objects
    else if (timestamp instanceof Date) {
        date = timestamp;
    }
    // Handle date strings
    else if (typeof timestamp === 'string' && new Date(timestamp).toString() !== 'Invalid Date') {
        date = new Date(timestamp);
    } else {
        return 'N/A';
    }
    
    try {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error("Could not format time:", date, error);
        return 'Invalid Time';
    }
};