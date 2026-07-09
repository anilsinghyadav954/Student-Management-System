/**
 * Given an axios response with responseType: 'blob', triggers a browser
 * file download with the given filename.
 */
export const downloadBlob = (blobResponse, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobResponse.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
