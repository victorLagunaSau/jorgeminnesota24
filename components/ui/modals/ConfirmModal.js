import React from "react";

const ConfirmModal = ({
    open,
    titulo = "Confirmar",
    mensaje,
    children,
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    confirmClass = "btn-info text-white",
    loading = false,
    borderColor = "border-info",
}) => {
    if (!open) return null;

    return (
        <dialog className="modal" open>
            <div className={`modal-box bg-white border-t-4 ${borderColor}`}>
                <h3 className="font-bold text-lg text-black uppercase">{titulo}</h3>
                {mensaje && <p className="py-4 text-[13px] text-gray-600">{mensaje}</p>}
                {children}
                <div className="modal-action">
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn btn-sm ${confirmClass}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop bg-black/30" onClick={onCancel} />
        </dialog>
    );
};

export default ConfirmModal;
