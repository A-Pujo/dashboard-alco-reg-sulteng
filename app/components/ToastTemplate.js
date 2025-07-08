'use client'
import React from 'react';
import { CircleCheckBig, CircleX, Info, TriangleAlert } from 'lucide-react'

/**
 * Komponen Toast Kustom untuk pesan sukses.
 * @param {object} props - Properti komponen.
 * @param {object} props.t - Objek toast dari react-hot-toast, digunakan untuk animasi.
 * @param {object} [props.type = 'success'] - Type toast.
 * @param {string} [props.title=''] - Judul toast.
 * @param {string} [props.description=''] - Deskripsi toast.
 */
const ToastTemplate = ({ t, type = 'success', title = '', description = '' }) => {
    let classRingStr = ''
    let classTextStr = ''
    switch (type) {
        case 'success':
            classRingStr = `ring-success`
            classTextStr = `text-success`
            break
        
        case 'error':
            classRingStr = `ring-error`
            classTextStr = `text-error`
            break
            
        case 'warning':
            classRingStr = `ring-warning`
            classTextStr = `text-warning`
            break
        
        default:
            classRingStr = `ring-info`
            classTextStr = `text-info`
            break
    }
    return (
        <div
        className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ${classRingStr} ring-opacity-5 transform transition-all duration-300 ease-out`}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {type == 'success' && (
                            <CircleCheckBig className={`${classTextStr} w-6 h-6`} />
                        )}
                        {type == 'error' && (
                            <CircleX className={`${classTextStr} w-6 h-6`} />
                        )}
                        {type == 'warning' && (
                            <TriangleAlert className={`${classTextStr} w-6 h-6`} />
                        )}
                        {type == 'info' && (
                            <Info className={`${classTextStr} w-6 h-6`} />
                        )}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className={`text-sm font-medium ${classTextStr}`}>
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ToastTemplate