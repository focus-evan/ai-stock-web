import type { ActionType } from "@ant-design/pro-components";
import type { IPORecord, IPOQueryParams } from "#src/api/ipo";

import { fetchIPOList } from "#src/api/ipo";
import { BasicContent } from "#src/components/basic-content";
import { BasicTable } from "#src/components/basic-table";
import { Button, Result } from "antd";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "react-error-boundary";
import { ReloadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { getIPOColumns } from "./constants";

export default function IPO() {
    const { t } = useTranslation();
    const actionRef = useRef<ActionType>(null);
    const [previousFilters, setPreviousFilters] = useState<string>("");
    const [retryCount, setRetryCount] = useState(0);
    const queryClient = useQueryClient();

    // Get column definitions from constants
    const columns = getIPOColumns(t);

    return (
        <ErrorBoundary
            FallbackComponent={IPOTableErrorFallback}
            onReset={() => {
                // Reset state and reload the table
                setPreviousFilters("");
                setRetryCount(0);
                actionRef.current?.reload();
            }}
        >
            <BasicContent className="h-full">
                <BasicTable<IPORecord>
                    adaptive
                    columns={columns}
                    actionRef={actionRef}
                    request={async (params) => {
                        // Build query parameters with all active filters
                        const queryParams: IPOQueryParams = {
                            page: params.current || 1,
                            page_size: params.pageSize || 20,
                        };

                        // Add filter parameters only if they have values (AND logic)
                        if (params.listing_status) {
                            queryParams.listing_status = params.listing_status as any;
                        }
                        if (params.market) {
                            queryParams.market = params.market as string;
                        }
                        if (params.exchange) {
                            queryParams.exchange = params.exchange as string;
                        }
                        if (params.start_date) {
                            queryParams.start_date = params.start_date as string;
                        }
                        if (params.end_date) {
                            queryParams.end_date = params.end_date as string;
                        }

                        // Create a filter signature to detect filter changes
                        const currentFilterSignature = JSON.stringify({
                            listing_status: params.listing_status,
                            market: params.market,
                            exchange: params.exchange,
                            start_date: params.start_date,
                            end_date: params.end_date,
                        });

                        // Check if filters have changed
                        if (previousFilters && previousFilters !== currentFilterSignature) {
                            // Reset to page 1 when filters change
                            queryParams.page = 1;
                            // Update the table's current page
                            if (actionRef.current) {
                                actionRef.current.setPageInfo?.({ current: 1 });
                            }
                        }

                        // Update the previous filters signature
                        setPreviousFilters(currentFilterSignature);

                        try {
                            // Use React Query's fetchQuery for caching
                            // This provides:
                            // - staleTime: 5 minutes (configured globally)
                            // - gcTime: 10 minutes (configured globally)
                            // - Automatic cache reuse for identical queries
                            const responseData = await queryClient.fetchQuery({
                                queryKey: ["ipo-list", queryParams],
                                queryFn: () => fetchIPOList(queryParams),
                                staleTime: 5 * 60 * 1000, // 5 minutes
                                gcTime: 10 * 60 * 1000, // 10 minutes
                            });

                            // Reset retry count on successful request
                            setRetryCount(0);

                            // Sort data by ipo_date in descending order (newest first)
                            const sortedData = [...responseData.data].sort((a, b) => {
                                const dateA = new Date(a.ipo_date).getTime();
                                const dateB = new Date(b.ipo_date).getTime();
                                return dateB - dateA; // Descending order
                            });

                            return {
                                data: sortedData,
                                total: responseData.total,
                                success: true,
                            };
                        }
                        catch (error: any) {
                            // Handle different error types with specific messages
                            let errorMessage = t("ipo.errors.fetchFailed");

                            // Network errors (no response from server)
                            if (error.name === "TypeError" || error.message?.includes("fetch")) {
                                errorMessage = t("ipo.errors.networkError");
                            }
                            // Server errors (5xx)
                            else if (error.response?.status >= 500) {
                                errorMessage = t("ipo.errors.serverError");

                                // Auto-retry once for server errors after 2 seconds
                                if (retryCount === 0) {
                                    setRetryCount(1);
                                    setTimeout(() => {
                                        actionRef.current?.reload();
                                    }, 2000);
                                    errorMessage = `${errorMessage} (${t("ipo.errors.retry")}...)`;
                                }
                            }
                            // Client errors (4xx)
                            else if (error.response?.status === 403) {
                                errorMessage = t("ipo.errors.noPermission");
                            }
                            else if (error.response?.status === 404) {
                                errorMessage = t("ipo.errors.fetchFailed");
                            }
                            else if (error.response?.status >= 400 && error.response?.status < 500) {
                                errorMessage = t("ipo.errors.fetchFailed");
                            }
                            // Timeout errors
                            else if (error.name === "TimeoutError" || error.message?.includes("timeout")) {
                                errorMessage = t("ipo.errors.networkError");
                            }

                            // Display error message using global message component
                            window.$message?.error(errorMessage);

                            console.error("IPO data fetch error:", error);

                            return {
                                data: [],
                                total: 0,
                                success: false,
                            };
                        }
                    }}
                    headerTitle={t("ipo.title")}
                    toolBarRender={() => [
                        <Button
                            key="retry"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                setRetryCount(0);
                                actionRef.current?.reload();
                            }}
                        >
                            {t("ipo.errors.retry")}
                        </Button>,
                    ]}
                    search={{
                        labelWidth: "auto",
                        defaultCollapsed: false,
                        searchGutter: 16,
                        optionRender: (_searchConfig, _formProps, dom) => dom,
                    }}
                    // Debounce filter changes by 300ms to prevent excessive API calls during rapid user input
                    debounceTime={300}
                    pagination={{
                        defaultPageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: [10, 20, 50, 100],
                    }}
                    onReset={() => {
                        // Handle filter clearing - reset to show unfiltered data
                        setPreviousFilters("");
                        if (actionRef.current) {
                            actionRef.current.setPageInfo?.({ current: 1 });
                            actionRef.current.reload();
                        }
                    }}
                />
            </BasicContent>
        </ErrorBoundary>
    );
}

// Error fallback component for table rendering errors
function IPOTableErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
    const { t } = useTranslation();

    return (
        <BasicContent className="h-full flex items-center justify-center">
            <Result
                status="error"
                title={t("ipo.errors.fetchFailed")}
                subTitle={error.message}
                extra={
                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={resetErrorBoundary}
                    >
                        {t("ipo.errors.retry")}
                    </Button>
                }
            />
        </BasicContent>
    );
}
