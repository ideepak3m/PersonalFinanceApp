// src/components/common/ConfirmModal.jsx
import React from 'react';

export const ConfirmModal = ({
    isOpen,
    title = 'Confirm',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Yes',
    cancelText = 'No',
    isAlert = false,
    alertType = 'info' // 'info', 'success', 'error', 'warning'
}) => {
    if (!isOpen) return null;

    const alertStyles = {
        info: 'bg-blue-600 hover:bg-blue-700',
        success: 'bg-green-600 hover:bg-green-700',
        error: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <p className="text-gray-600 whitespace-pre-line mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    {!isAlert && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-lg font-medium ${isAlert ? alertStyles[alertType] : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isAlert ? 'OK' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Custom hook to use the confirm/alert modal
export const useConfirmModal = () => {
    const [modalState, setModalState] = React.useState({
        isOpen: false,
        title: 'Confirm',
        message: '',
        resolve: null,
        isAlert: false,
        alertType: 'info'
    });

    const confirm = (message, title = 'Confirm') => {
        return new Promise((resolve) => {
            setModalState({
                isOpen: true,
                title,
                message,
                resolve,
                isAlert: false,
                alertType: 'info'
            });
        });
    };

    const alert = (message, title = 'Notice', type = 'info') => {
        return new Promise((resolve) => {
            setModalState({
                isOpen: true,
                title,
                message,
                resolve,
                isAlert: true,
                alertType: type
            });
        });
    };

    const handleConfirm = () => {
        modalState.resolve?.(true);
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        modalState.resolve?.(false);
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const ConfirmModalComponent = () => (
        <ConfirmModal
            isOpen={modalState.isOpen}
            title={modalState.title}
            message={modalState.message}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isAlert={modalState.isAlert}
            alertType={modalState.alertType}
        />
    );

    return { confirm, alert, ConfirmModalComponent };
};
