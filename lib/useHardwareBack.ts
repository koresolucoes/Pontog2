import { useEffect, useRef, useCallback } from 'react';

type CloseHandler = () => void;

// Module-level stack to keep track of open modals
const modalStack: CloseHandler[] = [];

// Keep track of whether we've added the global event listener
let isGlobalListenerAdded = false;

const handleGlobalPopState = (e: PopStateEvent) => {
    if (modalStack.length > 0) {
        // We have modals to close!
        // Pop the top-most modal
        const topModalCloseHandler = modalStack.pop();
        
        if (topModalCloseHandler) {
            topModalCloseHandler();
        }
    }
};

export function useHardwareBack(isOpen: boolean, onClose: CloseHandler) {
    const wasOpen = useRef(false);
    
    // Stable reference to the onClose callback so we don't have to update the stack array constantly
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // The function we will actually put in the stack
    const stackCloseHandler = useCallback(() => {
        wasOpen.current = false;
        onCloseRef.current();
    }, []);

    useEffect(() => {
        if (!isGlobalListenerAdded) {
            window.addEventListener('popstate', handleGlobalPopState);
            isGlobalListenerAdded = true;
        }

        if (isOpen && !wasOpen.current) {
            // Push a dummy state to history so the back button can be intercepted
            window.history.pushState({ modalId: Date.now() }, '');
            modalStack.push(stackCloseHandler);
            wasOpen.current = true;
        } else if (!isOpen && wasOpen.current) {
            // The modal was closed via UI (e.g. clicking an X button).
            // We need to remove it from our stack.
            const index = modalStack.indexOf(stackCloseHandler);
            if (index > -1) {
                modalStack.splice(index, 1);
            }
            
            // We also need to consume the history state we pushed, IF it is currently the active state.
            // If the user opened multiple modals and closed the top one, history.back() is correct.
            // But checking this perfectly is tricky. A safe heuristic is to check if the state has our signature.
            if (window.history.state && window.history.state.modalId) {
                // Remove our event listener temporarily so we don't accidentally close another modal when we go back
                window.removeEventListener('popstate', handleGlobalPopState);
                window.history.back();
                
                // Re-add after a tiny delay to let the browser process the back navigation
                setTimeout(() => {
                    window.addEventListener('popstate', handleGlobalPopState);
                }, 50);
            }
            
            wasOpen.current = false;
        }
    }, [isOpen, stackCloseHandler]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wasOpen.current) {
                const index = modalStack.indexOf(stackCloseHandler);
                if (index > -1) {
                    modalStack.splice(index, 1);
                }
                wasOpen.current = false;
            }
        };
    }, [stackCloseHandler]);
}
