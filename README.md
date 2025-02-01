# Features Analyser

![build](https://github.com/azheval/vscode-features-analyzer/actions/workflows/ci.yml/badge.svg)

## Команды

- FeaturesAnalyzer.Create Features List. Сканирует каталог из `featuresAnalyzer.featuresFolder` и строит таблицу по данным фича-файлов.

![out table](images/image_1.png)

- FeaturesAnalyser.Check Indentation. Сканирует каталог из `featuresAnalyzer.featuresFolder` и строит таблицу по некорректным отступам.

![out table](images/image_2.png)

## Настройка

- featuresAnalyzer.featuresFolder. Каталог для сканирования.
- featuresAnalyzer.defaultIndentation. Поддерживаемые варианты значения, кроме незаполненного: `space`, `tab`.

## Описание

### Check Indentation

- Проверяет наличие пробелов и табуляций в начальных отступах в одной строке.

![out table](images/image_3.png)

- Проверяет наличие пробелов и табуляций в начальных отступах в файле при наличии тега `@tree`.

![out table](images/image_4.png)

- Проверяет наличие пробелов в начальных отступах в файле при значении `tab` настройки `featuresAnalyzer.defaultIndentation`.

![out table](images/image_5.png)

- Проверяет наличие табуляции в начальных отступах в файле при значении `space` настройки `featuresAnalyzer.defaultIndentation`.

![out table](images/image_6.png)
