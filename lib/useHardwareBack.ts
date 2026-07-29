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
    const modalIdRef = useRef<number | null>(null);
    
    // Stable reference to the onClose callback so we don't have to update the stack array constantly
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // The function we will actually put in the stack
    const stackCloseHandler = useCallback(() => {
        wasOpen.current = false;
        modalIdRef.current = null;
        onCloseRef.current();
    }, []);

    useEffect(() => {
        if (!isGlobalListenerAdded) {
            window.addEventListener('popstate', handleGlobalPopState);
            isGlobalListenerAdded = true;
        }

        if (isOpen && !wasOpen.current) {
            // Push a dummy state to history so the back button can be intercepted
            const id = Date.now() + Math.random();
            modalIdRef.current = id;
            window.history.pushState({ modalId: id }, '');
            modalStack.push(stackCloseHandler);
            wasOpen.current = true;
        } else if (!isOpen && wasOpen.current) {
            // The modal was closed via UI (e.g. clicking an X button).
            // We need to remove it from our stack.
            const index = modalStack.indexOf(stackCloseHandler);
            if (index > -1) {
                modalStack.splice(index, 1);
            }
            
            const currentModalId = modalIdRef.current;
            modalIdRef.current = null;
            wasOpen.current = false;

            // We only consume the history state if it is still the active state for THIS exact modal instance
            if (currentModalId && window.history.state && window.history.state.modalId === currentModalId) {
                // Remove our event listener temporarily so we don't accidentally close another modal when we go back
                window.removeEventListener('popstate', handleGlobalPopState);
                window.history.back();
                
                // Re-add after a tiny delay to let the browser process the back navigation
                setTimeout(() => {
                    window.addEventListener('popstate', handleGlobalPopState);
                }, 50);
            }
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
                modalIdRef.current = null;
            }
        };
    }, [stackCloseHandler]);
}
