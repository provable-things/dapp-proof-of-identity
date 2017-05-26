import parseDataUri from 'parse-data-uri';

export const parseMarkdown = (file) => {
    return parseDataUri(file).data.toString();
}
